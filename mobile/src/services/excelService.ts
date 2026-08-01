import * as XLSX from "xlsx-js-style";
import * as FileSystem from "expo-file-system/legacy";

type Contact = {
  id?: string;
  name?: string;
  company?: string;
  designation?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  country?: string;
  linkedin?: string;
};

const COLORS = {
  green: "19A85B",
  white: "FFFFFF",
  black: "1F2933",
  border: "DCE5E0",
  alternateRow: "F5FAF7",
};

const thinBorder = {
  top: {
    style: "thin",
    color: { rgb: COLORS.border },
  },
  bottom: {
    style: "thin",
    color: { rgb: COLORS.border },
  },
  left: {
    style: "thin",
    color: { rgb: COLORS.border },
  },
  right: {
    style: "thin",
    color: { rgb: COLORS.border },
  },
};

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function getFileDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function getLongestLineLength(value: unknown): number {
  const text = normalizeText(value);

  if (!text) {
    return 0;
  }

  return Math.max(
    ...text.split(/\r?\n/).map((line) => line.length),
    0
  );
}

function calculateColumnWidths(
  rows: Array<Array<string | number>>
): Array<{ wch: number }> {
  if (rows.length === 0) {
    return [];
  }

  const columnCount = Math.max(
    ...rows.map((row) => row.length)
  );

  const minimumWidths = [
    9,  // Sr. No.
    18, // Name
    22, // Company
    20, // Designation
    18, // Phone
    28, // Email
    28, // Website
    32, // Address
    18, // Country
    28, // LinkedIn
  ];

  const maximumWidths = [
    10, // Sr. No.
    38, // Name
    45, // Company
    38, // Designation
    28, // Phone
    50, // Email
    55, // Website
    60, // Address
    25, // Country
    55, // LinkedIn
  ];

  return Array.from(
    { length: columnCount },
    (_, columnIndex) => {
      const longestValue = rows.reduce(
        (maximum, row) => {
          return Math.max(
            maximum,
            getLongestLineLength(
              row[columnIndex] ?? ""
            )
          );
        },
        0
      );

      const minimumWidth =
        minimumWidths[columnIndex] ?? 14;

      const maximumWidth =
        maximumWidths[columnIndex] ?? 45;

      return {
        wch: Math.min(
          Math.max(
            longestValue + 4,
            minimumWidth
          ),
          maximumWidth
        ),
      };
    }
  );
}

export async function exportContactsToExcel(
  contacts: Contact[]
): Promise<string> {
  try {
    if (
      !Array.isArray(contacts) ||
      contacts.length === 0
    ) {
      throw new Error("No contacts found.");
    }

    const headers = [
      "Sr. No.",
      "Name",
      "Company",
      "Designation",
      "Phone",
      "Email",
      "Website",
      "Address",
      "Country",
      "LinkedIn",
    ];

    const contactRows: Array<Array<string | number>> =
      contacts.map((contact, index) => [
        index + 1,
        normalizeText(contact.name),
        normalizeText(contact.company),
        normalizeText(contact.designation),
        normalizeText(contact.phone),
        normalizeText(contact.email),
        normalizeText(contact.website),
        normalizeText(contact.address),
        normalizeText(contact.country),
        normalizeText(contact.linkedin),
      ]);

    const worksheetData: Array<
      Array<string | number>
    > = [headers, ...contactRows];

    const worksheet =
      XLSX.utils.aoa_to_sheet(worksheetData);

    const totalColumns = headers.length;
    const firstDataRowIndex = 1;
    const lastDataRowIndex = contactRows.length;

    // Automatically adjust widths using actual cell content.
    worksheet["!cols"] =
      calculateColumnWidths(worksheetData);

    // Header row height.
    worksheet["!rows"] = [
      {
        hpt: 30,
      },
    ];

    /*
     * Add Excel filter dropdowns.
     *
     * This places filter dropdowns on every header,
     * including the Country column.
     */
    worksheet["!autofilter"] = {
      ref: `A1:J${contactRows.length + 1}`,
    };

    // Style table header.
    for (
      let columnIndex = 0;
      columnIndex < totalColumns;
      columnIndex += 1
    ) {
      const cellAddress =
        XLSX.utils.encode_cell({
          r: 0,
          c: columnIndex,
        });

      const cell = worksheet[cellAddress];

      if (!cell) {
        continue;
      }

      cell.s = {
        font: {
          bold: true,
          color: {
            rgb: COLORS.white,
          },
          sz: 11,
        },
        fill: {
          patternType: "solid",
          fgColor: {
            rgb: COLORS.green,
          },
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true,
        },
        border: thinBorder,
      };
    }

    // Style contact rows.
    for (
      let rowIndex = firstDataRowIndex;
      rowIndex <= lastDataRowIndex;
      rowIndex += 1
    ) {
      const useAlternateFill =
        (rowIndex - firstDataRowIndex) % 2 === 1;

      for (
        let columnIndex = 0;
        columnIndex < totalColumns;
        columnIndex += 1
      ) {
        const cellAddress =
          XLSX.utils.encode_cell({
            r: rowIndex,
            c: columnIndex,
          });

        let cell = worksheet[cellAddress];

        if (!cell) {
          worksheet[cellAddress] = {
            t: "s",
            v: "",
          };

          cell = worksheet[cellAddress];
        }

        cell.s = {
          font: {
            color: {
              rgb: COLORS.black,
            },
            sz: 10,
          },
          fill: {
            patternType: "solid",
            fgColor: {
              rgb: useAlternateFill
                ? COLORS.alternateRow
                : COLORS.white,
            },
          },
          alignment: {
            horizontal:
              columnIndex === 0
                ? "center"
                : "left",
            vertical: "center",
            wrapText: true,
          },
          border: thinBorder,
        };

        // Phone is column E, index 4.
        // Store it as text to preserve +91 and leading zeroes.
        if (columnIndex === 4) {
          cell.t = "s";
          cell.v = normalizeText(cell.v);
          cell.z = "@";
        }
      }
    }

    worksheet["!ref"] =
      XLSX.utils.encode_range({
        s: {
          r: 0,
          c: 0,
        },
        e: {
          r: contactRows.length,
          c: totalColumns - 1,
        },
      });

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Business Contacts"
    );

    const excelFile = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });

    const fileName =
      `ScanMyCard_Business_Contacts_` +
      `${getFileDate()}.xlsx`;

    if (!FileSystem.documentDirectory) {
      throw new Error(
        "Application document directory is unavailable."
      );
    }

    const uri =
      FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(
      uri,
      excelFile,
      {
        encoding:
          FileSystem.EncodingType.Base64,
      }
    );

    return uri;
  } catch (error) {
    console.error(
      "Excel Export Error:",
      error
    );

    throw error;
  }
}