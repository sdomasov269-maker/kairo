from pathlib import Path

from dotenv import load_dotenv


def _environment_root(provider_dir: Path) -> Path:
    candidates = [provider_dir]
    for parent in provider_dir.parents:
        if parent == Path(parent.anchor):
            break
        candidates.append(parent)
        if len(candidates) == 3:
            break

    return next(
        (
            candidate
            for candidate in reversed(candidates)
            if (candidate / ".env.local").is_file()
            or (candidate / ".env").is_file()
        ),
        provider_dir,
    )


def load_provider_environment(root: Path | None = None) -> None:
    environment_root = (
        Path(root)
        if root is not None
        else _environment_root(Path(__file__).resolve().parent)
    )
    load_dotenv(environment_root / ".env.local", override=False)
    load_dotenv(environment_root / ".env", override=False)
