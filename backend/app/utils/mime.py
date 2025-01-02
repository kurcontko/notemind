import mimetypes


def get_mime_type(file_path):
    mime_type, encoding = mimetypes.guess_type(file_path)
    return mime_type or 'application/octet-stream'  # Default to 'application/octet-stream' if type is None