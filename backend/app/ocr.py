import io
import os
import re
import unicodedata

import pytesseract
from PIL import Image, ImageFilter, ImageOps

# Chemin de Tesseract (Windows). ممكن نبدلوه بمتغير البيئة TESSERACT_CMD.
TESSERACT_CMD = os.getenv(
    "TESSERACT_CMD",
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
)
if os.path.exists(TESSERACT_CMD):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# "إعلام آلي" بعد التطبيع = "اعلام الي"، ويقبل أيضاً "الاعلام الالي"
INFORMATIQUE_PATTERN = re.compile(r"(?:ال)?اعلام\s+(?:ال)?الي")
# سطر الفرع أحياناً كيتقرا "علام" وحدها (الـ OCR كيضيع "آلي"): كنقبلوه غير إلا كان السطر كامل قصير
BRANCH_WORD_LINE = re.compile(r"^\s*(?:ال)?ا?علام\s*$")

TARGET_WIDTH = 2200
THRESHOLDS = (None, 140)  # None = رمادي كما هو، 140 = أبيض وأسود
PSM_MODES = (11,)


def normalize_arabic(text: str) -> str:
    """يبسّط النص العربي باش المقارنة تكون أقل حساسية لأخطاء الـ OCR."""
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"[\u064B-\u065F\u0640]", "", text)  # التشكيل والتطويل
    text = re.sub("[إأآٱ]", "ا", text)
    text = text.replace("ى", "ي").replace("ة", "ه")
    return text


def is_informatique(text: str) -> bool:
    """True إذا لقى الفرع 'إعلام آلي' (أو سطر الفرع اللي فيه 'علام' غير)."""
    normalized = normalize_arabic(text)
    if INFORMATIQUE_PATTERN.search(normalized):
        return True
    return any(BRANCH_WORD_LINE.match(line) for line in normalized.splitlines())


def _upscale(image: Image.Image) -> Image.Image:
    """يكبّر الصورة الصغيرة باش الحروف تولي أوضح لـ Tesseract."""
    if image.width < TARGET_WIDTH:
        scale = min(4, max(2, round(TARGET_WIDTH / image.width)))
        image = image.resize(
            (image.width * scale, image.height * scale),
            Image.Resampling.LANCZOS,
        )
    return image.filter(ImageFilter.SHARPEN)


def _variants(image: Image.Image):
    """نسخ من نفس الصورة: رمادية، وأبيض وأسود بعتبة."""
    for threshold in THRESHOLDS:
        if threshold is None:
            yield image
        else:
            yield image.point(lambda p, t=threshold: 255 if p > t else 0)


def _branch_found(image: Image.Image) -> bool:
    """يجرب التقطيعات (psm) على نسخ الصورة، ويوقف أول ما يلقى الفرع."""
    for variant in _variants(image):
        for psm in PSM_MODES:
            text = pytesseract.image_to_string(variant, lang="ara+eng", config=f"--psm {psm}")
            if is_informatique(text):
                return True
    return False


def card_is_informatique(image_bytes: bytes) -> bool:
    """True إذا لقى الفرع 'إعلام آلي' في الكارطة. الصورة ما تتخزنش."""
    original = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("L")
    original = ImageOps.autocontrast(original)

    # 1) الكارطة كاملة
    if _branch_found(_upscale(original)):
        return True

    # 2) الجهة اليمنى التحتانية (فين كيكون الفرع)
    w, h = original.size
    bottom_right = original.crop((int(w * 0.3), int(h * 0.45), w, h))
    return _branch_found(_upscale(bottom_right))


def read_card_text(image_bytes: bytes) -> str:
    """نص الكارطة كاملة (للتجربة والتشخيص فقط)."""
    original = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes))).convert("L")
    original = ImageOps.autocontrast(original)
    return pytesseract.image_to_string(_upscale(original), lang="ara+eng", config="--psm 11")
