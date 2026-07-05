


def preprocess_card(image_bytes):
    """
    Mobile app already:
    - Resizes image
    - Compresses image
    - Deletes original

    So simply return the bytes.
    """
    return image_bytes