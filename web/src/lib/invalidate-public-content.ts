import { revalidateTag } from "next/cache";
export function invalidatePublicContent() {
  try { revalidateTag("public-content", { expire: 0 }); }
  catch (error) {
    // Database integration tests have no Next request/static-generation store.
    if (!(error instanceof Error) || !/static generation store|incrementalCache|request scope/i.test(error.message)) throw error;
  }
}
