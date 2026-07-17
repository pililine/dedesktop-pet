#!/usr/bin/env python3
"""Pet Factory CLI.

    python3 -m pet_factory selftest
    python3 -m pet_factory validate <petId|packageDir>
    python3 -m pet_factory build <petId> [--frames DIR] [--out DIR]
    python3 -m pet_factory slice <strip.png> <destDir> [--frames N]
"""
import argparse
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="pet_factory")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("selftest", help="路径解析与环境自检")

    p_val = sub.add_parser("validate", help="校验宠物包（镜像运行时规则）")
    p_val.add_argument("target", help="petId 或宠物包目录")

    p_build = sub.add_parser("build", help="从帧工作区组装宠物包")
    p_build.add_argument("pet_id")
    p_build.add_argument("--frames", default=None, help="帧目录（默认 work/<pet>/frames）")
    p_build.add_argument("--out", default=None, help="输出目录（默认 pets/<pet>，即正式包）")

    p_slice = sub.add_parser("slice", help="横条切帧并清理透明残留")
    p_slice.add_argument("strip")
    p_slice.add_argument("dest")
    p_slice.add_argument("--frames", type=int, default=8)

    args = parser.parse_args(argv)

    if args.cmd == "selftest":
        from pet_factory import paths

        paths.selftest()
        return 0

    if args.cmd == "validate":
        from pet_factory.qa.validate import validate_package

        problems = validate_package(args.target)
        if problems:
            print(f"✗ {args.target}: {len(problems)} 个问题")
            for p in problems:
                print(f"  - {p}")
            return 1
        print(f"✓ {args.target}: 校验通过")
        return 0

    if args.cmd == "build":
        from pet_factory.build.compose import compose_atlas
        from pet_factory.qa.validate import validate_package

        info = compose_atlas(args.pet_id, args.frames, args.out)
        print(f"✓ 组装 {args.pet_id}: sheet {info['sheet']} ({info['rows']}x{info['cols']}) -> {info['out']}")
        problems = validate_package(info["out"])
        if problems:
            print("✗ 组装结果未通过校验：")
            for p in problems:
                print(f"  - {p}")
            return 1
        print("✓ 组装结果校验通过")
        return 0

    if args.cmd == "slice":
        from pet_factory.processing.slice import slice_strip

        n = slice_strip(args.strip, args.dest, args.frames)
        print(f"✓ {args.strip} -> {args.dest} ({n} 帧)")
        return 0

    return 2


if __name__ == "__main__":
    sys.exit(main())
