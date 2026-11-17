"""Private, immutable company-logo files; no network or static-webroot access."""
from __future__ import annotations

import io
import os
from pathlib import Path
import re
import stat
import uuid
import warnings

from flask import current_app
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.formparser import FormDataParser

from src.config import BASE_DIR
from src.services.regional_urls import trusted_regional_base_url

MAX_UPLOAD_BYTES = 2 * 1024 * 1024
MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 64 * 1024
MAX_PIXELS = 16_000_000
MAX_DIMENSION = 1024
OPAQUE_RE = re.compile(r"^[a-f0-9]{32}$")
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


class LogoValidationError(ValueError):
    pass


class _BoundedFile(io.BytesIO):
    def write(self, data):
        if self.tell() + len(data) > MAX_UPLOAD_BYTES:
            raise RequestEntityTooLarge()
        return super().write(data)


def read_logo_upload(request):
    """Endpoint-local limits, including unknown-length WSGI streams and parts."""
    if request.mimetype != "multipart/form-data":
        raise LogoValidationError("Envie um arquivo no campo multipart logo.")
    opened = []

    def stream_factory(**_kwargs):
        stream = _BoundedFile()
        opened.append(stream)
        return stream

    parser = FormDataParser(
        stream_factory=stream_factory,
        max_content_length=MAX_MULTIPART_BYTES,
        max_form_memory_size=64 * 1024,
        max_form_parts=1,
        silent=False,
    )
    try:
        _, form, files = parser.parse_from_environ(request.environ)
        if form or set(files.keys()) != {"logo"} or len(files.getlist("logo")) != 1:
            raise LogoValidationError("Envie somente um arquivo no campo logo.")
        upload = files["logo"]
        if not upload.filename or Path(upload.filename).suffix.lower() not in ALLOWED_EXTENSIONS:
            raise LogoValidationError("Formato permitido: PNG, JPEG ou WebP.")
        data = upload.stream.read(MAX_UPLOAD_BYTES + 1)
        if len(data) > MAX_UPLOAD_BYTES:
            raise RequestEntityTooLarge()
        if not data:
            raise LogoValidationError("O arquivo de logo está vazio.")
        return normalize_logo(data)
    except RequestEntityTooLarge:
        raise
    except ValueError as exc:
        raise LogoValidationError(str(exc)) from exc
    finally:
        for stream in opened:
            stream.close()


def normalize_logo(data):
    """Verify real raster content, bound dimensions, strip metadata and reencode."""
    if len(data) > MAX_UPLOAD_BYTES:
        raise RequestEntityTooLarge()
    # Lazy import leaves existing API routes available during code-only rollback.
    from PIL import Image, ImageOps, UnidentifiedImageError

    def validate(image):
        width, height = image.size
        if width < 1 or height < 1 or width * height > MAX_PIXELS:
            raise LogoValidationError("A imagem excede o limite de 16 milhões de pixels.")
        if getattr(image, "is_animated", False) or getattr(image, "n_frames", 1) != 1:
            raise LogoValidationError("Imagens animadas não são permitidas.")
        # APNG with only one frame is still an animation container.
        if image.format == "PNG" and "loop" in image.info:
            raise LogoValidationError("Imagens animadas não são permitidas.")

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data), formats=["PNG", "JPEG", "WEBP"]) as image:
                validate(image)
                image.verify()
            with Image.open(io.BytesIO(data), formats=["PNG", "JPEG", "WEBP"]) as image:
                validate(image)
                image.load()
                oriented = ImageOps.exif_transpose(image)
                mode = "RGBA" if "A" in oriented.getbands() or "transparency" in oriented.info else "RGB"
                converted = oriented.convert(mode)
                converted.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
                # New image owns only pixels: no EXIF, ICC, comments or PNG text.
                clean = Image.new(mode, converted.size)
                clean.paste(converted)
                output = io.BytesIO()
                clean.save(output, format="PNG")
                return output.getvalue()
    except LogoValidationError:
        raise
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise LogoValidationError("Imagem inválida. Use PNG, JPEG ou WebP estático.") from exc


def logo_url(site, opaque):
    if not isinstance(opaque, str) or not OPAQUE_RE.fullmatch(opaque):
        return None
    base = trusted_regional_base_url(site)
    return f"{base}/api/companies/logos/{opaque}.png" if base else None


def _directory_fd(*, create=False):
    raw = current_app.config.get("COMPANY_LOGO_UPLOAD_DIR") or os.getenv("COMPANY_LOGO_UPLOAD_DIR")
    path = Path(raw or Path(BASE_DIR) / "database" / "company_logos")
    if not path.is_absolute() or ".." in path.parts:
        raise OSError("Company logo directory must be an absolute private path")
    static = current_app.static_folder
    if static and (path == Path(static) or Path(static) in path.parents):
        raise OSError("Company logos cannot be placed in the static webroot")
    # Open every component without following symlinks; keep the final descriptor
    # for all operations, so directory renames cannot redirect reads/writes.
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC
    fd = os.open("/", flags)
    try:
        for part in path.parts[1:]:
            if create:
                try:
                    os.mkdir(part, mode=0o700, dir_fd=fd)
                except FileExistsError:
                    pass
            next_fd = os.open(part, flags, dir_fd=fd)
            os.close(fd)
            fd = next_fd
        info = os.fstat(fd)
        if info.st_uid != os.geteuid():
            raise OSError("Company logo directory must be owned by the API user")
        if create:
            os.fchmod(fd, 0o700)
        elif info.st_mode & 0o077:
            raise OSError("Company logo directory permissions are unsafe")
        return fd
    except BaseException:
        os.close(fd)
        raise


def store_logo(png):
    """Publish atomically without overwriting or deleting any previous logo."""
    opaque = uuid.uuid4().hex
    temporary = f".{uuid.uuid4().hex}.tmp"
    directory = _directory_fd(create=True)
    created = False
    try:
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_CLOEXEC,
                     0o600, dir_fd=directory)
        created = True
        with os.fdopen(fd, "wb") as stream:
            stream.write(png)
            stream.flush()
            os.fsync(stream.fileno())
        # Hard-link publication is atomic and refuses a pre-existing filename.
        os.link(temporary, f"{opaque}.png", src_dir_fd=directory,
                dst_dir_fd=directory, follow_symlinks=False)
        os.unlink(temporary, dir_fd=directory)
        created = False
        os.fsync(directory)
        return opaque
    finally:
        try:
            if created:
                os.unlink(temporary, dir_fd=directory)
        finally:
            os.close(directory)


def open_logo(opaque):
    """Open only a regular immutable PNG via opaque ID, never a supplied path."""
    if not isinstance(opaque, str) or not OPAQUE_RE.fullmatch(opaque):
        raise FileNotFoundError("Invalid company logo identifier")
    directory = _directory_fd()
    try:
        fd = os.open(f"{opaque}.png", os.O_RDONLY | os.O_NOFOLLOW | os.O_CLOEXEC | os.O_NONBLOCK,
                     dir_fd=directory)
        try:
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077 or info.st_uid != os.geteuid():
                raise OSError("Unsafe company logo file")
            return os.fdopen(fd, "rb")
        except BaseException:
            os.close(fd)
            raise
    finally:
        os.close(directory)
