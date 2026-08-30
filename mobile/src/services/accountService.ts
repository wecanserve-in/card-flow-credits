import { auth } from "./firebase";
import { api } from "./api";

export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user.");
  }

  const response = await api.post("/account/delete");

  if (!response.data?.success) {
    throw new Error("Backend deletion failed.");
  }
}
