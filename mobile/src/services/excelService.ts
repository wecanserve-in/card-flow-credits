import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system/legacy";

export async function exportContactsToExcel(
  contacts: any[]
) {
  try {
    if (!contacts || contacts.length === 0) {
      throw new Error("No contacts found.");
    }

    const excelData = contacts.map((contact) => ({
      Name: contact.name || "",
      Company: contact.company || "",
      Designation: contact.designation || "",
      Phone: contact.phone || "",
      Email: contact.email || "",
      Website: contact.website || "",
      Address: contact.address || "",
      LinkedIn: contact.linkedin || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Contacts"
    );

    const excelFile = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    });

    const fileName = `Scan2Sheet_Contacts_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    const uri = FileSystem.documentDirectory + fileName;

    await FileSystem.writeAsStringAsync(uri, excelFile, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return uri;
  } catch (error) {
    console.log("Excel Export Error:", error);
    throw error;
  }
}