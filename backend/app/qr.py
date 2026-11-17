import re

# Le QR de la carte contient un lien PROGRES : .../check/<12 chiffres>
# Les 4 premiers chiffres ne sont pas le matricule : le matricule = les 8 derniers.
QR_PATTERN = re.compile(r"https://progres\.mesrs\.dz/check/(\d{12})/?")


def parse_matricule_from_qr(qr_text: str) -> str | None:
    match = QR_PATTERN.fullmatch(qr_text.strip())
    if match is None:
        return None
    number = match.group(1)
    return number[4:]
