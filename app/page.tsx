import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signInWithGoogle } from "@/app/actions/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/ledger");
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Budget tracker
        </h1>
        <p className="mt-2 text-zinc-600">
          Sign in to track your primary account balance and future cash
          position—like your monthly sheet, without the spreadsheet.
        </p>
      </div>
      <div>
        <form action={signInWithGoogle}>
          <button
            className="inline-flex rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            type="submit"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
