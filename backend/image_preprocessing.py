import cv2
import numpy as np

def preprocess_card(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)

    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return image_bytes

    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        processed = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )

        success, buffer = cv2.imencode(".jpg", processed)

        if success:
            return buffer.tobytes()

        return image_bytes

    except Exception:
        return image_bytes