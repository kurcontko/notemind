import io
import os
from typing import Union, BinaryIO
import mimetypes
import tempfile
import functools

from openai import AsyncAzureOpenAI, AsyncOpenAI
from fastapi import UploadFile

class WhisperTranscriber:
    SUPPORTED_FORMATS = {
        'audio/flac': 'flac',
        'audio/x-flac': 'flac',  # Might be given by python-magic
        'audio/m4a': 'm4a',
        'audio/mp3': 'mp3',
        'audio/mpeg': 'mp3',
        'audio/mp4': 'mp4',
        'video/mp4': 'mp4',  # Some MP4 audio files might have video MIME type
        'audio/mpeg': 'mpeg',
        'audio/mpga': 'mpga',
        'audio/ogg': 'ogg',
        'audio/x-wav': 'wav',
        'audio/wav': 'wav',
        'audio/webm': 'webm',
        'video/webm': 'webm',  # WebM can be either audio or video
        'application/octet-stream': None  # Handle unknown types more gracefully
    }

    def __init__(self, client: Union[AsyncAzureOpenAI, AsyncOpenAI], deployment_name: str = "whisper"):
        self.client = client
        self.deployment_name = deployment_name

    def _validate_audio_format(self, file_content: bytes, filename: str = "") -> None:
        """
        Validate if the audio file format is supported using MIME type detection.

        Args:
            file_content: The first chunk of the audio file to determine MIME type.
            filename: The optional filename to use in format detection.

        Raises:
            ValueError: If the file format is not supported
        """
        mime_type, _ = mimetypes.guess_type(file_content)

        # Fallback to mimetypes if python-magic fails or for unknown types
        if not mime_type or mime_type == 'application/octet-stream':
            mime_type, _ = mimetypes.guess_type(filename or "unknown.unknown")
            mime_type = mime_type or 'application/octet-stream'  # Default if guess_type fails

        if mime_type not in self.SUPPORTED_FORMATS:
            supported_formats = list(set(self.SUPPORTED_FORMATS.values()))  # Get unique format names
            raise ValueError(
                f"Unsupported audio format with MIME type: {mime_type}. "
                f"Supported formats: {sorted(supported_formats)}"
            )

        # You could return the normalized format name if needed, or None if not explicitly supported
        return self.SUPPORTED_FORMATS.get(mime_type)

    async def transcribe(self, audio_path: Union[str, bytes, BinaryIO], filename: str = "") -> str:
        """
        Transcribe audio using Whisper API.

        Args:
            audio_path: File path, bytes, file-like object, or UploadFile containing the audio
            filename: Name of the file for MIME type detection

        Returns:
            str: Transcribed text

        Raises:
            ValueError: If transcription fails or input format is invalid
            FileNotFoundError: If the audio file is not found
        """
        try:
            # Validate format using filename
            #self._validate_audio_format(audio_path, filename)
            audio_file = self._prepare_audio_file(audio_path)

            # Transcribe using appropriate client
            if isinstance(self.client, AsyncAzureOpenAI):
                transcription = await self.client.audio.transcriptions.create(
                    deployment_name=self.deployment_name,
                    file=audio_file,
                    model="whisper-1"
                )
            elif isinstance(self.client, AsyncOpenAI):
                transcription = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            else:
                raise ValueError("Invalid client type")

            return transcription.text

        except UnicodeDecodeError as e:
            raise ValueError(f"Unicode decoding failed: {str(e)}")
        except Exception as e:
            raise ValueError(f"Transcription failed: {str(e)}")
        finally:
            if isinstance(audio_path, str) and 'audio_file' in locals():
                audio_file.close()

    def _prepare_audio_file(self, audio_path: Union[str, bytes, BinaryIO]) -> bytes:
        """
        Prepare the audio file for transcription.

        Args:
            audio_path: File path, bytes, or file-like object

        Returns:
            BinaryIO: File-like object ready for transcription
        """
        if isinstance(audio_path, str):
            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found at {audio_path}")
            return open(audio_path, "rb")
        elif isinstance(audio_path, bytes):
            return audio_path
        elif isinstance(audio_path, io.IOBase):
            # Convert to bytes
            return bytes(audio_path.read())
        else:
            raise ValueError(
                "Invalid input type. Expected string path, bytes, file-like object, or UploadFile")

    def _get_mime_type(self, file_path: str) -> str:
        """
        Get MIME type of a file.

        Args:
            file_path: Path to the file

        Returns:
            str: MIME type of the file
        """
        mime_type, _ = mimetypes.guess_type(file_path)
        return mime_type or 'application/octet-stream'