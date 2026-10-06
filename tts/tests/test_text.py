import pytest

def test_mishkal_keeps_punctuation():
    pytest.importorskip("mishkal")
    from seera_tts.text.diacritizer import MishkalDiacritizer
    out = MishkalDiacritizer()("خرج النبي. ثم عاد إلى مكة؟ نعم!")
    assert out.endswith("!") and ". " in out and "؟" in out
    assert "\x01" not in out


from seera_tts.text.normalizer import normalize

def test_normalize_expands_honorifics_and_hijri_dates():
    out = normalize("هاجر النبي ﷺ سنة ١ هـ [الدرر السنية]")
    assert out == "هاجر النبي صلى الله عليه وسلم سنة 1 للهجرة"
import pytest
from seera_tts.text.diacritizer import NoOpDiacritizer, _clean_mishkal, build_diacritizer


def test_clean_mishkal_restores_punctuation():
    original = "خرج النبي. ثم عاد إلى مكة؟ نعم!"
    fake_output = " خَرَجَ النَّبِيُّ\x01ثُمَّ عَادَ إِلَى مَكَّةَ ؟ نَعَم\x01"  # real mishkal shape
    assert _clean_mishkal(original, fake_output) == "خَرَجَ النَّبِيُّ. ثُمَّ عَادَ إِلَى مَكَّةَ؟ نَعَم!"


def test_build_diacritizer():
    assert isinstance(build_diacritizer("none"), NoOpDiacritizer)
    assert build_diacritizer("NONE")("نص") == "نص"
    with pytest.raises(ValueError):
        build_diacritizer("unknown")


def test_mishkal_real():
    pytest.importorskip("mishkal")  # skipped if mishkal isn't installed
    out = build_diacritizer("mishkal")("خرج النبي. ثم عاد!")
    assert "\x01" not in out and out.endswith("!")

from seera_tts.text import TextPreparer
from seera_tts.text.diacritizer import NoOpDiacritizer
from seera_tts.text.lexicon import PronunciationLexicon


def make_preparer() -> TextPreparer:
    return TextPreparer(
        lexicon=PronunciationLexicon({"يثرب": "يَثْرِب"}),
        diacritizer=NoOpDiacritizer(),
        max_segment_chars=150,
    )


def test_preparer_segment_kinds():
    segments = make_preparer().prepare("هاجر ﷺ إلى يثرب. قال تعالى ﴿إلا تنصروه﴾")
    assert [s.kind for s in segments] == ["speech", "speech", "quran"]


def test_preparer_display_vs_spoken():
    first = make_preparer().prepare("هاجر ﷺ إلى يثرب.")[0]
    assert first.display_text == "هاجر صلى الله عليه وسلم إلى يثرب."
    assert first.spoken_text == "هاجر صلى الله عليه وسلم إلى يَثْرِب."


def test_preparer_quran_is_untouched():
    quran = make_preparer().prepare("قال تعالى ﴿إلا تنصروه﴾")[-1]
    assert quran.kind == "quran"
    assert quran.display_text == quran.spoken_text == "﴿إلا تنصروه﴾"

def test_engines_import_without_torch():
    from seera_tts.engines import TTSEngine, build_engine  # must not crash locally
    import pytest
    with pytest.raises(ValueError):
        build_engine("unknown", None)

def test_real_lexicon_file_is_valid():
    from seera_tts.config import TTSConfig
    lexicon = PronunciationLexicon.from_json(TTSConfig().lexicon_path)
    assert len(lexicon) > 0

def test_normalize_parentheses_rules_still_work():
    assert normalize("قال (ص) كذا (ج2، ص45) «وانتهى»") == "قال صلى الله عليه وسلم كذا وانتهى"




# ---------------------------------------------- real-book text (الرحيق المختوم)
from seera_tts.text.chunker import SentenceStream


def test_stream_never_splits_inside_square_brackets():
    s = SentenceStream()
    out = s.feed("قال أشياخ قريش: ما علمك بذلك [: فقال؟ ] إنكم حين أشرفتم. ثم مضى.") + s.flush()
    assert out == ["قال أشياخ قريش: ما علمك بذلك [: فقال؟ ] إنكم حين أشرفتم.", "ثم مضى."]


def test_unclosed_bracket_does_not_block_splitting_forever():
    s = SentenceStream()
    text = "بداية [ ملاحظة لم تغلق " + "كلام " * 150 + ". جملة تالية."
    assert len(s.feed(text) + s.flush()) == 2


def test_normalize_drops_broken_references_from_bad_extraction():
    assert normalize("11 إلى26 ] وفي خلالها صور كيفية تفكيره") == "وفي خلالها صور كيفية تفكيره"
    assert normalize("[ المطففين: 29: 33[. وقد أكثروا") == "وقد أكثروا"
    assert normalize("سنة 3 من البعثة") == "سنة 3 من البعثة"  # normal numbers untouched


def test_spoken_text_stays_within_engine_limit():
    # the lexicon adds tashkeel AFTER splitting; the spoken text must still fit the limit
    lex = PronunciationLexicon({"صلى الله عليه وسلم": "صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ"})
    prep = TextPreparer(lex, NoOpDiacritizer(), 60)
    text = "قال النبي صلى الله عليه وسلم لأصحابه كلامًا طويلًا ثم قال النبي صلى الله عليه وسلم كلامًا آخر."
    segs = prep.prepare(text)
    assert all(len(s.spoken_text) <= 60 for s in segs)
    assert " ".join(s.display_text for s in segs) == text  # nothing lost
