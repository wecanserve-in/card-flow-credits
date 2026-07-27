import React, {
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";

type CardOrientation =
  | "landscape"
  | "portrait";

type MeasuredRectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } =
    useWindowDimensions();

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const cameraRef = useRef<any>(null);
  const containerRef = useRef<View>(null);
  const scanFrameRef = useRef<View>(null);

  const [images, setImages] =
    useState<string[]>([]);

  const [isCapturing, setIsCapturing] =
    useState(false);

  const [flashEnabled, setFlashEnabled] =
    useState(false);

  const [
    cardOrientation,
    setCardOrientation,
  ] = useState<CardOrientation>(
    "landscape"
  );

  /*
   * Horizontal card:
   * 86% of screen width with a 1.62 ratio.
   *
   * Vertical card:
   * Smaller width and taller frame.
   */
  const landscapeFrameWidth = Math.min(
    screenWidth * 0.86,
    430
  );

  const portraitFrameWidth = Math.min(
    screenWidth * 0.54,
    260
  );

  const frameWidth =
    cardOrientation === "landscape"
      ? landscapeFrameWidth
      : portraitFrameWidth;

  const frameHeight =
    cardOrientation === "landscape"
      ? frameWidth / 1.62
      : frameWidth * 1.62;

  /**
   * Measures the green scanner frame relative
   * to the full camera container.
   */
  const measureScanFrame =
    (): Promise<MeasuredRectangle> => {
      return new Promise(
        (resolve, reject) => {
          if (
            !containerRef.current ||
            !scanFrameRef.current
          ) {
            reject(
              new Error(
                "Scanner frame is not ready."
              )
            );
            return;
          }

          containerRef.current.measureInWindow(
            (
              containerX,
              containerY,
              containerWidth,
              containerHeight
            ) => {
              scanFrameRef.current?.measureInWindow(
                (
                  frameX,
                  frameY,
                  measuredWidth,
                  measuredHeight
                ) => {
                  if (
                    measuredWidth <= 0 ||
                    measuredHeight <= 0 ||
                    containerWidth <= 0 ||
                    containerHeight <= 0
                  ) {
                    reject(
                      new Error(
                        "Invalid scanner frame measurements."
                      )
                    );
                    return;
                  }

                  resolve({
                    x:
                      frameX -
                      containerX,
                    y:
                      frameY -
                      containerY,
                    width:
                      measuredWidth,
                    height:
                      measuredHeight,
                  });
                }
              );
            }
          );
        }
      );
    };

  /**
   * Converts the visible scanner frame coordinates
   * into coordinates inside the captured photograph.
   *
   * CameraView uses a cover-like preview. Therefore,
   * part of the captured image can extend beyond the
   * visible phone screen. This calculation accounts
   * for that difference.
   */
  const calculateCropArea = (
    photoWidth: number,
    photoHeight: number,
    cameraWidth: number,
    cameraHeight: number,
    frame: MeasuredRectangle
  ) => {
    const previewScale = Math.max(
      cameraWidth / photoWidth,
      cameraHeight / photoHeight
    );

    const displayedImageWidth =
      photoWidth * previewScale;

    const displayedImageHeight =
      photoHeight * previewScale;

    const hiddenHorizontalAmount =
      (displayedImageWidth -
        cameraWidth) /
      2;

    const hiddenVerticalAmount =
      (displayedImageHeight -
        cameraHeight) /
      2;

    let originX =
      (frame.x +
        hiddenHorizontalAmount) /
      previewScale;

    let originY =
      (frame.y +
        hiddenVerticalAmount) /
      previewScale;

    let cropWidth =
      frame.width / previewScale;

    let cropHeight =
      frame.height / previewScale;

    originX = Math.max(
      0,
      Math.round(originX)
    );

    originY = Math.max(
      0,
      Math.round(originY)
    );

    cropWidth = Math.round(
      Math.min(
        cropWidth,
        photoWidth - originX
      )
    );

    cropHeight = Math.round(
      Math.min(
        cropHeight,
        photoHeight - originY
      )
    );

    if (
      cropWidth <= 0 ||
      cropHeight <= 0
    ) {
      throw new Error(
        "The calculated crop area is invalid."
      );
    }

    return {
      originX,
      originY,
      width: cropWidth,
      height: cropHeight,
    };
  };

  const takePicture = async () => {
    if (
      !cameraRef.current ||
      isCapturing
    ) {
      return;
    }

    try {
      setIsCapturing(true);

      /*
       * Measure the frame before taking the photo.
       */
      const [
        frameMeasurements,
        containerMeasurements,
      ] = await Promise.all([
        measureScanFrame(),

        new Promise<{
          width: number;
          height: number;
        }>((resolve, reject) => {
          if (!containerRef.current) {
            reject(
              new Error(
                "Camera container is not ready."
              )
            );
            return;
          }

          containerRef.current.measure(
            (
              _x,
              _y,
              width,
              height
            ) => {
              if (
                width <= 0 ||
                height <= 0
              ) {
                reject(
                  new Error(
                    "Invalid camera dimensions."
                  )
                );
                return;
              }

              resolve({
                width,
                height,
              });
            }
          );
        }),
      ]);

      const start = Date.now();

      const photo =
        await cameraRef.current.takePictureAsync(
          {
            quality: 0.9,

            /*
             * Keep this false so Expo processes the
             * photo into the device's correct orientation.
             */
            skipProcessing: false,
          }
        );

      console.log(
        "Capture time:",
        Date.now() - start,
        "ms"
      );

      if (
        !photo?.uri ||
        !photo?.width ||
        !photo?.height
      ) {
        Alert.alert(
          "Capture Failed",
          "The card image could not be captured. Please try again."
        );
        return;
      }

      console.log("Original photo:", {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      });

      const cropArea =
        calculateCropArea(
          photo.width,
          photo.height,
          containerMeasurements.width,
          containerMeasurements.height,
          frameMeasurements
        );

      console.log(
        "Selected card orientation:",
        cardOrientation
      );

      console.log(
        "Calculated crop area:",
        cropArea
      );

      const croppedImage =
        await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            {
              crop: cropArea,
            },
          ],
          {
            compress: 0.9,
            format:
              ImageManipulator.SaveFormat
                .JPEG,
          }
        );

      if (!croppedImage?.uri) {
        throw new Error(
          "The cropped image was not created."
        );
      }

      console.log(
        "Cropped card image:",
        {
          uri: croppedImage.uri,
          width: croppedImage.width,
          height: croppedImage.height,
        }
      );

      /*
       * Add only the cropped image.
       * The original full image is not added.
       */
      setImages((previousImages) => {
        if (
          previousImages.includes(
            croppedImage.uri
          )
        ) {
          return previousImages;
        }

        return [
          ...previousImages,
          croppedImage.uri,
        ];
      });
    } catch (error) {
      console.error(
        "Camera capture/crop error:",
        error
      );

      Alert.alert(
        "Card Capture Failed",
        "The card could not be cropped. Make sure it is positioned inside the frame and try again."
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUpload = () => {
    if (images.length === 0) {
      Alert.alert(
        "No Cards Scanned",
        "Please scan at least one business card before continuing."
      );
      return;
    }

    /*
     * These are now cropped card images,
     * not the complete camera photos.
     */
    (globalThis as any).scannedImages =
      images;

    router.push("/scanned-queue");
  };

  if (!permission) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator
          size="large"
          color="#09A84E"
        />

        <Text style={styles.loadingText}>
          Preparing camera...
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView
        style={styles.permissionScreen}
      >
        <View
          style={styles.permissionContent}
        >
          <View
            style={styles.permissionIcon}
          >
            <Ionicons
              name="camera-outline"
              size={42}
              color="#09A84E"
            />
          </View>

          <Text
            style={styles.permissionTitle}
          >
            Camera Access Required
          </Text>

          <Text
            style={styles.permissionText}
          >
            Snip It needs access to your
            camera to scan business cards
            and extract contact details.
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Ionicons
              name="camera"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.permissionButtonText
              }
            >
              Allow Camera Access
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            style={
              styles.permissionBackButton
            }
            onPress={() => router.back()}
          >
            <Text
              style={
                styles.permissionBackText
              }
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      ref={containerRef}
      style={styles.container}
    >
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashEnabled}
      />

      {/* Dark camera overlay */}
      <View
        pointerEvents="none"
        style={styles.cameraShade}
      />

      {/* Header */}
      <View
        style={[
          styles.topBar,
          {
            top: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.topIconButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="close"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View
          style={styles.titleContainer}
        >
          <Text
            style={styles.screenTitle}
          >
            Scan Business Card
          </Text>

          <Text
            style={styles.screenSubtitle}
          >
            Position the card inside the
            frame
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.topIconButton,
            flashEnabled &&
              styles.activeFlashButton,
          ]}
          onPress={() =>
            setFlashEnabled(
              (current) => !current
            )
          }
        >
          <Ionicons
            name={
              flashEnabled
                ? "flash"
                : "flash-off"
            }
            size={22}
            color={
              flashEnabled
                ? "#122218"
                : "#FFFFFF"
            }
          />
        </TouchableOpacity>
      </View>

      {/* Scanner area */}
      <View
        style={[
          styles.scannerArea,
          cardOrientation ===
            "portrait" &&
            styles.portraitScannerArea,
        ]}
      >
        <View
          style={styles.orientationSelector}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isCapturing}
            style={[
              styles.orientationButton,
              cardOrientation ===
                "landscape" &&
                styles.orientationButtonActive,
            ]}
            onPress={() =>
              setCardOrientation(
                "landscape"
              )
            }
          >
            <Ionicons
              name="card-outline"
              size={17}
              color={
                cardOrientation ===
                "landscape"
                  ? "#122218"
                  : "#FFFFFF"
              }
            />

            <Text
              style={[
                styles.orientationButtonText,
                cardOrientation ===
                  "landscape" &&
                  styles.orientationButtonTextActive,
              ]}
            >
              Horizontal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isCapturing}
            style={[
              styles.orientationButton,
              cardOrientation ===
                "portrait" &&
                styles.orientationButtonActive,
            ]}
            onPress={() =>
              setCardOrientation(
                "portrait"
              )
            }
          >
            <Ionicons
              name="phone-portrait-outline"
              size={17}
              color={
                cardOrientation ===
                "portrait"
                  ? "#122218"
                  : "#FFFFFF"
              }
            />

            <Text
              style={[
                styles.orientationButtonText,
                cardOrientation ===
                  "portrait" &&
                  styles.orientationButtonTextActive,
              ]}
            >
              Vertical
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.instructionBadge}
        >
          <View
            style={styles.instructionDot}
          />

          <Text
            style={styles.instructionText}
          >
            Hold your phone steady
          </Text>
        </View>

        <View
          ref={scanFrameRef}
          collapsable={false}
          style={[
            styles.scanFrame,
            {
              width: frameWidth,
              height: frameHeight,
            },
          ]}
        >
          <View
            style={[
              styles.corner,
              styles.topLeft,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.topRight,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.bottomLeft,
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.bottomRight,
            ]}
          />

          <View style={styles.scanLine} />
        </View>

        <Text style={styles.helperText}>
          Make sure all four corners of the
          business card are visible
        </Text>
      </View>

      {/* Bottom panel */}
      <View
        style={[
          styles.bottomPanel,
          {
            paddingBottom: Math.max(
              insets.bottom,
              18
            ),
          },
        ]}
      >
        <View style={styles.counterRow}>
          <View
            style={styles.counterBadge}
          >
            <View
              style={styles.counterIcon}
            >
              <Ionicons
                name="images-outline"
                size={17}
                color="#09A84E"
              />
            </View>

            <View>
              <Text
                style={
                  styles.counterTitle
                }
              >
                {images.length}{" "}
                {images.length === 1
                  ? "card"
                  : "cards"}{" "}
                added
              </Text>

              <Text
                style={
                  styles.counterSubtitle
                }
              >
                You can scan multiple cards
              </Text>
            </View>
          </View>

          {images.length > 0 && (
            <View
              style={
                styles.successIndicator
              }
            >
              <Ionicons
                name="checkmark"
                size={15}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        <View style={styles.controlRow}>
          <View
            style={styles.sidePlaceholder}
          >
            <Ionicons
              name={
                cardOrientation ===
                "landscape"
                  ? "card-outline"
                  : "phone-portrait-outline"
              }
              size={22}
              color="#8A9490"
            />

            <Text
              style={
                styles.sidePlaceholderText
              }
            >
              {cardOrientation ===
              "landscape"
                ? "Horizontal"
                : "Vertical"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isCapturing}
            style={[
              styles.captureOuter,
              isCapturing &&
                styles.captureDisabled,
            ]}
            onPress={takePicture}
          >
            <View
              style={styles.captureMiddle}
            >
              {isCapturing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <View
                  style={
                    styles.captureInner
                  }
                />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.doneButton,
              images.length === 0 &&
                styles.doneButtonDisabled,
            ]}
            onPress={handleUpload}
          >
            <Text
              style={[
                styles.doneText,
                images.length === 0 &&
                  styles.doneTextDisabled,
              ]}
            >
              Done
            </Text>

            <View
              style={[
                styles.doneCount,
                images.length === 0 &&
                  styles.doneCountDisabled,
              ]}
            >
              <Text
                style={[
                  styles.doneCountText,
                  images.length === 0 &&
                    styles.doneCountTextDisabled,
                ]}
              >
                {images.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: "#F8FAF9",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 14,
    color: "#6F7874",
    fontSize: 14,
    fontWeight: "600",
  },

  permissionScreen: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },

  permissionContent: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#EAF8F0",
    borderWidth: 1,
    borderColor: "#D6F0E1",
    alignItems: "center",
    justifyContent: "center",
  },

  permissionTitle: {
    marginTop: 22,
    color: "#171C21",
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },

  permissionText: {
    maxWidth: 330,
    marginTop: 10,
    color: "#737C78",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
  },

  permissionButton: {
    width: "100%",
    maxWidth: 330,
    minHeight: 54,
    marginTop: 28,
    borderRadius: 17,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#09A84E",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 4,
  },

  permissionButtonText: {
    marginLeft: 9,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  permissionBackButton: {
    minHeight: 42,
    marginTop: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionBackText: {
    color: "#737C78",
    fontSize: 14,
    fontWeight: "700",
  },

  cameraShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      "rgba(0, 0, 0, 0.16)",
  },

  topBar: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  topIconButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor:
      "rgba(15, 20, 18, 0.58)",
    borderWidth: 1,
    borderColor:
      "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  activeFlashButton: {
    backgroundColor: "#DDF7E8",
    borderColor: "#BDEACF",
  },

  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: "center",
  },

  screenTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },

  screenSubtitle: {
    marginTop: 3,
    color:
      "rgba(255, 255, 255, 0.72)",
    fontSize: 11.5,
    fontWeight: "500",
    textAlign: "center",
  },

  scannerArea: {
    position: "absolute",
    top: "18%",
    left: 0,
    right: 0,
    alignItems: "center",
  },

  portraitScannerArea: {
    top: "15%",
  },

  orientationSelector: {
    minHeight: 43,
    marginBottom: 12,
    padding: 4,
    borderRadius: 16,
    backgroundColor:
      "rgba(14, 20, 17, 0.64)",
    borderWidth: 1,
    borderColor:
      "rgba(255, 255, 255, 0.16)",
    flexDirection: "row",
    alignItems: "center",
  },

  orientationButton: {
    minHeight: 35,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  orientationButtonActive: {
    backgroundColor: "#DDF7E8",
  },

  orientationButtonText: {
    marginLeft: 6,
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  orientationButtonTextActive: {
    color: "#122218",
  },

  instructionBadge: {
    minHeight: 34,
    marginBottom: 14,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor:
      "rgba(14, 20, 17, 0.60)",
    borderWidth: 1,
    borderColor:
      "rgba(255, 255, 255, 0.14)",
    flexDirection: "row",
    alignItems: "center",
  },

  instructionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#35E27D",
  },

  instructionText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  scanFrame: {
    position: "relative",
    borderRadius: 23,
    backgroundColor:
      "rgba(255, 255, 255, 0.04)",
  },

  corner: {
    position: "absolute",
    width: 47,
    height: 47,
    borderColor: "#35E27D",
  },

  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 21,
  },

  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 21,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 21,
  },

  bottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderBottomRightRadius: 21,
  },

  scanLine: {
    position: "absolute",
    top: "50%",
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor:
      "rgba(53, 226, 125, 0.72)",
    shadowColor: "#35E27D",
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },

  helperText: {
    width: "82%",
    marginTop: 13,
    color:
      "rgba(255, 255, 255, 0.86)",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
    textAlign: "center",
  },

  bottomPanel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    paddingTop: 15,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor:
      "rgba(250, 252, 251, 0.96)",
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    elevation: 12,
  },

  counterRow: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  counterBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  counterIcon: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  counterTitle: {
    marginLeft: 10,
    color: "#252B28",
    fontSize: 13,
    fontWeight: "800",
  },

  counterSubtitle: {
    marginLeft: 10,
    marginTop: 2,
    color: "#8A928E",
    fontSize: 10.5,
    fontWeight: "500",
  },

  successIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
  },

  controlRow: {
    minHeight: 104,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sidePlaceholder: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
  },

  sidePlaceholderText: {
    marginTop: 5,
    color: "#8A9490",
    fontSize: 9.5,
    fontWeight: "700",
    textAlign: "center",
  },

  captureOuter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#09A84E",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 5,
  },

  captureDisabled: {
    opacity: 0.65,
  },

  captureMiddle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
  },

  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor:
      "rgba(255, 255, 255, 0.72)",
  },

  doneButton: {
    minWidth: 82,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 15,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  doneButtonDisabled: {
    backgroundColor: "#E6EBE8",
  },

  doneText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  doneTextDisabled: {
    color: "#919994",
  },

  doneCount: {
    minWidth: 23,
    height: 23,
    marginLeft: 7,
    paddingHorizontal: 5,
    borderRadius: 8,
    backgroundColor:
      "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

  doneCountDisabled: {
    backgroundColor: "#D8DEDA",
  },

  doneCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  doneCountTextDisabled: {
    color: "#8A928E",
  },
});