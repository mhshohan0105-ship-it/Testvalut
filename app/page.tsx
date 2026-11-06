import { redirect } from "next/navigation";
import { DEMO_MODE } from "@/lib/demo";

export default function Home() {
  // A demo link goes straight to the Try the demo button.
  redirect(DEMO_MODE ? "/login" : "/dashboard");
}
