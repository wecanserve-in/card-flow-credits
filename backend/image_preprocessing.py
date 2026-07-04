import cv2
import numpy as np


def preprocess_card(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return image_bytes

    try:
        original = image.copy()

        # Resize for contour detection
        ratio = image.shape[0] / 500.0

        resized = cv2.resize(
            image,
            (int(image.shape[1] / ratio), 500)
        )

        gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)

        # Better edge detection
        gray = cv2.GaussianBlur(gray, (7, 7), 0)

        edged = cv2.Canny(gray, 30, 200)

        kernel = np.ones((5, 5), np.uint8)

        edged = cv2.dilate(edged, kernel, iterations=2)
        edged = cv2.erode(edged, kernel, iterations=1)

        contours, _ = cv2.findContours(
            edged,
            cv2.RETR_EXTERNAL,
            cv2.CHAIN_APPROX_SIMPLE
        )

        contours = sorted(
            contours,
            key=cv2.contourArea,
            reverse=True
        )

        card_contour = None

        for contour in contours:

            area = cv2.contourArea(contour)

            # Ignore very small contours
            if area < 10000:
                continue

            peri = cv2.arcLength(contour, True)

            approx = cv2.approxPolyDP(
                contour,
                0.02 * peri,
                True
            )

            if len(approx) == 4:

                x, y, w, h = cv2.boundingRect(approx)

                aspect_ratio = max(w, h) / min(w, h)

                # Accept both horizontal and vertical cards
                if 1.3 <= aspect_ratio <= 2.5:
                    card_contour = approx

                    print(
                        f"Card contour found | Area={area} | AR={aspect_ratio}"
                    )

                    break

        # Crop card if detected
        if card_contour is not None:

            pts = card_contour.reshape(4, 2) * ratio

            x, y, w, h = cv2.boundingRect(
                pts.astype(np.int32)
            )

            padding = 20

            x = max(0, x - padding)
            y = max(0, y - padding)

            w = min(
                original.shape[1] - x,
                w + (padding * 2)
            )

            h = min(
                original.shape[0] - y,
                h + (padding * 2)
            )

            image = original[y:y+h, x:x+w]

            # Rotate vertical card to horizontal
            h2, w2 = image.shape[:2]

            if h2 > w2:
                image = cv2.rotate(
                    image,
                    cv2.ROTATE_90_CLOCKWISE
                )

            cv2.imwrite("cropped_debug.jpg", image)
            print("Card detected and cropped")

        else:
            print("No card contour detected")
            cv2.imwrite("no_contour_debug.jpg", original)

        # Light denoising
        image = cv2.fastNlMeansDenoisingColored(
            image,
            None,
            5,
            5,
            7,
            21
        )

        # Reduce Gemini tokens
        h, w = image.shape[:2]

        MAX_WIDTH = 1000

        if w > MAX_WIDTH:

            scale = MAX_WIDTH / w

            image = cv2.resize(
                image,
                (
                    MAX_WIDTH,
                    int(h * scale)
                ),
                interpolation=cv2.INTER_AREA
            )

        success, buffer = cv2.imencode(
            ".jpg",
            image,
            [cv2.IMWRITE_JPEG_QUALITY, 75]
        )

        if success:
            return buffer.tobytes()

        return image_bytes

    except Exception as e:
        print("Preprocessing error:", e)
        return image_bytes