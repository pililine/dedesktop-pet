"""Pet Factory 单元测试。

运行：/opt/homebrew/bin/python3 -m unittest discover -s tests -v
覆盖：root 定位、各层路径解析、校验器（合法/非法/rejected 不入构建）、
切帧+组装的确定性重建（与正式 atlas 逐字节一致）、无用户绝对路径。
"""
import hashlib
import json
import os
import shutil
import tempfile
import unittest

from pet_factory import paths
from pet_factory.build.compose import compose_atlas
from pet_factory.processing.slice import slice_strip
from pet_factory.qa.validate import validate_package


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


class TestPaths(unittest.TestCase):
    def test_root_and_layers(self):
        self.assertTrue((paths.PROJECT_ROOT / "pet_factory").is_dir())
        self.assertTrue((paths.APP_ROOT / "package.json").exists())
        for p in [
            paths.source_assets("wangdulan"),
            paths.codex_output("wangdulan"),
            paths.work("wangdulan"),
            paths.pets("wangdulan"),
        ]:
            self.assertTrue(str(p).startswith(str(paths.PROJECT_ROOT)))

    def test_no_user_absolute_paths_in_factory_code(self):
        for dirpath, _dirs, files in os.walk(paths.PET_FACTORY_ROOT):
            if "__pycache__" in dirpath:
                continue
            for f in files:
                if f.endswith(".py"):
                    body = open(os.path.join(dirpath, f), encoding="utf-8").read()
                    self.assertNotIn("/Users/", body, f"{f} 内出现用户绝对路径")


class TestValidate(unittest.TestCase):
    def test_official_pets_pass(self):
        self.assertEqual(validate_package("default"), [])
        self.assertEqual(validate_package("wangdulan"), [])

    def test_broken_config_fails(self):
        with tempfile.TemporaryDirectory() as td:
            json.dump(
                {"id": "x", "atlas": {"columns": 4, "rows": 1}, "defaultScale": 9,
                 "animations": {"jump": {"row": 5, "frames": 9, "frameDurationMs": 5, "loop": "yes"}}},
                open(os.path.join(td, "pet.json"), "w"),
            )
            problems = validate_package(td)
            joined = "\n".join(problems)
            self.assertIn("idle", joined)
            self.assertIn("defaultScale", joined)
            self.assertIn("row 越界", joined)
            self.assertIn("frames 越界", joined)

    def test_rejected_assets_never_reach_build(self):
        # 构建只读取显式 frames 目录；rejected/ 不在任何默认输入路径上。
        rej = paths.rejected("wangdulan")
        self.assertNotEqual(str(rej), str(paths.frames("wangdulan")))
        self.assertFalse(str(paths.frames("wangdulan")).startswith(str(rej)))


class TestDeterministicRebuild(unittest.TestCase):
    def test_approved_strips_rebuild_matches_official_atlas(self):
        """approved 素材 → 切帧 → 组装，结果必须与正式 wangdulan atlas 逐字节一致。"""
        apr_manifest = paths.approved("wangdulan") / "APPROVED.json"
        if not apr_manifest.exists():
            self.skipTest("no approved manifest")
        approved = json.load(open(apr_manifest, encoding="utf-8"))
        with tempfile.TemporaryDirectory() as td:
            frames_dir = os.path.join(td, "frames")
            for e in approved:
                slice_strip(
                    str(paths.approved("wangdulan") / e["file"]),
                    os.path.join(frames_dir, e["action"]),
                    e.get("frames", 8),
                )
            out = os.path.join(td, "candidate")
            os.makedirs(out)
            shutil.copy(paths.pets("wangdulan") / "pet.json", os.path.join(out, "pet.json"))
            info = compose_atlas("wangdulan", frames_dir, out)
            self.assertEqual(validate_package(out), [])
            self.assertEqual(
                sha(os.path.join(out, "spritesheet.webp")),
                sha(paths.pets("wangdulan") / "spritesheet.webp"),
                "确定性重建失败：候选 atlas 与正式 atlas 不一致",
            )
            # pet.json 的手工调优字段（pingPong/时长）必须在重建中保留
            cand = json.load(open(os.path.join(out, "pet.json"), encoding="utf-8"))
            official = json.load(open(paths.pets("wangdulan") / "pet.json", encoding="utf-8"))
            self.assertEqual(cand["animations"], official["animations"])


if __name__ == "__main__":
    unittest.main()
