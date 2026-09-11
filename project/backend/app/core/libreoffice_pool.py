import asyncio

# LibreOffice headless does not handle concurrent invocations safely against
# a shared user profile. Module 1 serializes all conversions through this
# single semaphore rather than standing up a real worker pool.
# See ARCHITECTURE.md, Section 6.1.
_libreoffice_lock = asyncio.Semaphore(1)


def get_libreoffice_lock() -> asyncio.Semaphore:
    return _libreoffice_lock
