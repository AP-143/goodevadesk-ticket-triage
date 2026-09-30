"""Compare Gemini categories with a local zero-shot NLI model and extract entities with GLiNER."""

import argparse
import json
import urllib.request
from pathlib import Path

from gliner import GLiNER
from transformers import pipeline

NER_MODEL = "urchade/gliner_multi_pii-v1"
NLI_MODEL = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
ENTITY_LABELS = ["email", "phone number", "invoice number", "order number"]
CATEGORIES = {
    "billing": "payments, invoices, charges, refunds or subscriptions",
    "technical": "bugs, errors, login problems or integrations",
    "general": "a general question or feedback",
}


def api(base_url: str, api_key: str, path: str, body: dict | None = None):
    request = urllib.request.Request(
        base_url + path,
        data=json.dumps(body).encode() if body else None,
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def is_plausible(label: str, text: str) -> bool:
    # The model sometimes tags plain words such as "email" or "invoice".
    return "@" in text if label == "email" else any(c.isdigit() for c in text)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--api-key", default="dev-key-acme-0001")
    parser.add_argument("--seed", action="store_true", help="create sample tickets first")
    args = parser.parse_args()

    if args.seed:
        samples = Path(__file__).with_name("sample_tickets.json")
        for ticket in json.loads(samples.read_text(encoding="utf-8")):
            api(args.url, args.api_key, "/tickets", ticket)

    tickets = [t for t in api(args.url, args.api_key, "/tickets") if t["category"]]
    if not tickets:
        raise SystemExit("No triaged tickets. Set GEMINI_API_KEY or run with --seed.")

    ner = GLiNER.from_pretrained(NER_MODEL)
    nli = pipeline("zero-shot-classification", model=NLI_MODEL)
    by_description = {description: name for name, description in CATEGORIES.items()}

    agreed = 0
    for ticket in tickets:
        text = f"{ticket['subject']}\n{ticket['message']}"
        prediction = nli(
            text,
            list(CATEGORIES.values()),
            hypothesis_template="This support ticket is about {}.",
        )
        local = by_description[prediction["labels"][0]]
        agreed += local == ticket["category"]

        entities = dict.fromkeys(
            f"{e['label']}: {e['text']}"
            for e in ner.predict_entities(text, ENTITY_LABELS, threshold=0.5)
            if is_plausible(e["label"], e["text"])
        )
        found = "; ".join(entities) or "-"
        mark = "same" if local == ticket["category"] else "DIFF"
        print(f"[{mark}] llm={ticket['category']:<9} nli={local:<9} {ticket['subject']}")
        print(f"       entities: {found}")

    print(f"\nAgreement: {agreed}/{len(tickets)} ({agreed / len(tickets):.0%})")


if __name__ == "__main__":
    main()
