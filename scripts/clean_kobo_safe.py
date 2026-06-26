from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SOURCE_PATH = DATA_DIR / "kobo-missing-people-safe.json"
OUTPUT_PATH = DATA_DIR / "kobo-missing-people-clean.json"
REJECTED_PATH = DATA_DIR / "kobo-missing-people-clean-rejected.json"

PHONE_RE = re.compile(r"(?:\+?\d[\d\-\s().]{6,}\d)")
CI_INLINE_RE = re.compile(r"(?:C\.?I\.?|cedula|c[eé]dula)\s*[:\-]?\s*([\d.]{5,})", re.IGNORECASE)
AGE_RE = re.compile(r"(\d{1,3})\s*a(?:Ã±|ñ|n)os?", re.IGNORECASE)
NAME_START_RE = re.compile(
    r"^(?:desaparecid[oa]s?:?\s*|persona desaparecida:?\s*|desaparici[oó]n de\s*|desaparecido el se(?:Ã±|ñ)or\s*|desaparecida la se(?:Ã±|ñ)ora\s*|desaparecida:\s*|desaparecido:\s*|desaparecido ni(?:Ã±|ñ)o,\s*)?",
    re.IGNORECASE,
)
STOP_TOKENS = {
    "familia",
    "desaparecido",
    "desaparecida",
    "desaparecidos",
    "desaparecidas",
    "reporte",
    "ubicados",
    "personas",
    "persona",
    "senor",
    "señor",
    "senora",
    "señora",
    "madre",
    "hijo",
    "hija",
    "pareja",
}

LEADING_NAME_WORDS = {
    "el",
    "la",
    "los",
    "las",
    "señor",
    "señora",
    "senor",
    "senora",
}


def fix_text(value: str) -> str:
    if not value:
        return ""
    text = str(value)
    replacements = {
        "Ã¡": "á",
        "Ã©": "é",
        "Ã­": "í",
        "Ã³": "ó",
        "Ãº": "ú",
        "Ã": "Á",
        "Ã‰": "É",
        "Ã": "Í",
        "Ã“": "Ó",
        "Ãš": "Ú",
        "Ã±": "ñ",
        "Ã‘": "Ñ",
        "Â·": "·",
        "Â": "",
    }
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return re.sub(r"\s+", " ", text).strip()


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_phone(value: str) -> str:
    value = fix_text(value)
    if value.startswith("http://") or value.startswith("https://"):
        return ""
    if value.startswith("@"):
        return value
    digits = re.sub(r"\D", "", value)
    if len(digits) < 7 or len(digits) > 15:
        return ""
    return value


def extract_phone(*texts: str) -> str:
    for text in texts:
        scrubbed = re.sub(r"https?://\S+", " ", fix_text(text))
        for match in PHONE_RE.finditer(scrubbed):
            prefix = scrubbed[max(0, match.start() - 12) : match.start()].lower()
            if "c.i" in prefix or "cedula" in prefix or "ci:" in prefix:
                continue
            candidate = normalize_spaces(match.group(0))
            digits = re.sub(r"\D", "", candidate)
            if 7 <= len(digits) <= 15:
                return candidate
    for text in texts:
        text = fix_text(text)
        handle = re.search(r"@\w{3,}", text)
        if handle:
            return handle.group(0)
    return ""


def find_last_seen(description: str, current: str) -> str:
    description = fix_text(description)
    current = fix_text(current)
    patterns = [
        r"visto por ultima vez(?: en)? ([^|.,;]+)",
        r"vista por última vez(?: en)? ([^|.,;]+)",
        r"vive en ([^|.,;]+)",
        r"reside en ([^|.,;]+)",
        r"estaba en ([^|.,;]+)",
        r"última ubicación conocida(?: fue)? ([^|.,;]+)",
        r"en el edificio ([^|.,;]+)",
        r"en las residencias ([^|.,;]+)",
        r"en los edificios ([^|.,;]+)",
        r"en ([A-ZÁÉÍÓÚÑa-záéíóúñ0-9 .\-]+La Guaira)",
    ]
    for pattern in patterns:
        match = re.search(pattern, description, re.IGNORECASE)
        if match:
            return normalize_spaces(match.group(1).strip(" .,:;-"))
    if current.startswith("Ubicacion reportada:"):
        return "Ubicacion reportada"
    return current


def clean_name_from_description(description: str, fallback_first: str, fallback_last: str) -> tuple[str, str]:
    description = fix_text(description)
    head = description.split("|", 1)[0].strip()
    head = NAME_START_RE.sub("", head)
    head = head.replace("C.I.", " ").replace("CI", " ")
    head = re.sub(r"\([^)]*\)", " ", head)
    head = re.sub(r"\b\d[\d.]*\b", " ", head)

    split_markers = [
        " y su hijo ",
        " y sus dos hijos",
        " y ",
        ", ",
        ". ",
        " - ",
        " vive en ",
        " estaba en ",
        " se encuentra ",
        " en el edificio ",
        " en la urbanización ",
        " en la urbanizacion ",
        " en ",
    ]
    lower_head = head.lower()
    end = len(head)
    for marker in split_markers:
        pos = lower_head.find(marker)
        if pos > 0:
            end = min(end, pos)
    candidate = normalize_spaces(head[:end].strip(" .,:;-"))
    candidate = re.sub(r"\b(?:señor|señora|familia|persona|desaparecido|desaparecida|desaparecidos|desaparecidas)\b", " ", candidate, flags=re.IGNORECASE)
    candidate = normalize_spaces(candidate)
    parts = candidate.split()
    if len(parts) >= 2:
        while parts and parts[0].lower() in LEADING_NAME_WORDS:
            parts = parts[1:]
        if len(parts) >= 2:
            first = parts[0].title()
            last = " ".join(part.title() for part in parts[1:])
            return first, last
    fallback_parts = f"{fix_text(fallback_first)} {fix_text(fallback_last)}".split()
    while fallback_parts and fallback_parts[0].lower() in LEADING_NAME_WORDS:
        fallback_parts = fallback_parts[1:]
    if len(fallback_parts) >= 2:
        return fallback_parts[0].title(), " ".join(part.title() for part in fallback_parts[1:])
    if len(parts) >= 2:
        first = parts[0].title()
        last = " ".join(part.title() for part in parts[1:])
        return first, last
    return fix_text(fallback_first).title(), fix_text(fallback_last).title()


def should_reject(first_name: str, last_name: str, description: str, contact_phone: str) -> str | None:
    f = fix_text(first_name).lower()
    l = fix_text(last_name).lower()
    d = fix_text(description).lower()
    tokens = set((f + " " + l).split())
    if tokens & STOP_TOKENS:
        return "Nombre generico o incompleto"
    if " y " in l or "," in l:
        return "Parece agrupar varias personas"
    if "(" in last_name or ")" in last_name:
        return "Nombre con anotaciones mezcladas"
    if re.search(r"\d", last_name):
        return "Apellido contaminado con numeros"
    if not contact_phone:
        return "Sin contacto usable"
    if not contact_phone.startswith("@"):
        phone_digits = re.sub(r"\D", "", contact_phone)
        if len(phone_digits) < 10:
            return "Contacto parece incompleto o no telefonico"
    if "familia de" in d or "dos personas" in d or "personas desaparecidas" in d:
        return "Caso grupal"
    if "y su hijo" in d or "y sus dos hijos" in d:
        return "Caso grupal"
    return None


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    cleaned = []
    rejected = []

    for item in source:
        description = fix_text(item.get("description", ""))
        description_core = description.split("| Fuente:", 1)[0].strip()
        current_phone = normalize_phone(item.get("contactPhone", ""))
        better_phone = extract_phone(description_core, item.get("contactPhone", ""))
        contact_phone = better_phone or current_phone

        first_name, last_name = clean_name_from_description(
            description_core,
            item.get("firstName", ""),
            item.get("lastName", ""),
        )
        last_seen = find_last_seen(description, item.get("lastSeen", ""))
        raw_doc = re.sub(r"\D", "", fix_text(item.get("documentId", "")))
        phone_digits = re.sub(r"\D", "", contact_phone)
        document_id = ""
        if 5 <= len(raw_doc) <= 9 and raw_doc != phone_digits and not phone_digits.endswith(raw_doc):
            document_id = raw_doc
        inline_ci = CI_INLINE_RE.search(description_core)
        if inline_ci and not document_id:
            candidate_ci = re.sub(r"\D", "", inline_ci.group(1))
            if 5 <= len(candidate_ci) <= 9 and candidate_ci != phone_digits:
                document_id = candidate_ci

        age = fix_text(item.get("age", ""))
        if not age:
            age_match = AGE_RE.search(description_core)
            if age_match:
                age = age_match.group(1)

        reason = should_reject(first_name, last_name, description, contact_phone)
        if reason:
            rejected.append(
                {
                    "sourceId": item.get("sourceId"),
                    "reason": reason,
                    "firstName": first_name,
                    "lastName": last_name,
                    "description": description,
                }
            )
            continue

        cleaned.append(
            {
                "firstName": first_name,
                "lastName": last_name,
                "documentId": document_id,
                "age": age,
                "gender": "Sin especificar",
                "lastSeen": last_seen,
                "description": description,
                "photoUrl": "",
                "contactName": fix_text(item.get("contactName", "")) or "Contacto del reporte",
                "contactPhone": contact_phone,
                "sourceId": item.get("sourceId"),
            }
        )

    OUTPUT_PATH.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8")
    REJECTED_PATH.write_text(json.dumps(rejected, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "cleanCount": len(cleaned),
                "rejectedCount": len(rejected),
                "output": str(OUTPUT_PATH),
                "rejected": str(REJECTED_PATH),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
