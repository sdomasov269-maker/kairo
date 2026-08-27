import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from environment import load_provider_environment


class ProviderEnvironmentTest(unittest.TestCase):
    def test_priority_is_process_then_local_then_default(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".env.local").write_text(
                "KAIRO_ENV_PRIORITY=local\nKAIRO_LOCAL_ONLY=local\n",
                encoding="utf-8",
            )
            (root / ".env").write_text(
                "KAIRO_ENV_PRIORITY=default\nKAIRO_DEFAULT_ONLY=default\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"KAIRO_ENV_PRIORITY": "process"}, clear=False):
                os.environ.pop("KAIRO_LOCAL_ONLY", None)
                os.environ.pop("KAIRO_DEFAULT_ONLY", None)
                load_provider_environment(root)
                self.assertEqual(os.environ["KAIRO_ENV_PRIORITY"], "process")
                self.assertEqual(os.environ["KAIRO_LOCAL_ONLY"], "local")
                self.assertEqual(os.environ["KAIRO_DEFAULT_ONLY"], "default")
                os.environ.pop("KAIRO_LOCAL_ONLY", None)
                os.environ.pop("KAIRO_DEFAULT_ONLY", None)


if __name__ == "__main__":
    unittest.main()
