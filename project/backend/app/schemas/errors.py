class ConversionError(Exception):
    """Base class for all conversion errors carrying a machine-readable code."""

    code = "INTERNAL_ERROR"
    status_code = 500

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class UnsupportedFileTypeError(ConversionError):
    code = "UNSUPPORTED_FILE_TYPE"
    status_code = 400


class FileTooLargeError(ConversionError):
    code = "FILE_TOO_LARGE"
    status_code = 413


class CorruptedDocumentError(ConversionError):
    code = "CORRUPTED_DOCUMENT"
    status_code = 422


class NoTextLayerError(ConversionError):
    code = "NO_TEXT_LAYER"
    status_code = 422


class ConversionTimeoutError(ConversionError):
    code = "CONVERSION_TIMEOUT"
    status_code = 504


class ConversionFailedError(ConversionError):
    code = "CONVERSION_FAILED"
    status_code = 500


class MissingConversionToolError(ConversionError):
    code = "MISSING_CONVERSION_TOOL"
    status_code = 503


class TooFewFilesError(ConversionError):
    code = "TOO_FEW_FILES"
    status_code = 400


class InvalidPageRangeError(ConversionError):
    code = "INVALID_PAGE_RANGE"
    status_code = 400


class ZipCreationFailedError(ConversionError):
    code = "ZIP_CREATION_FAILED"
    status_code = 500
