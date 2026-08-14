"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { clientApi } from "@/lib/client-api";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await clientApi(`/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      router.push(mode === "register" ? "/create" : "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl place-items-center px-4 py-12 sm:px-8">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-line bg-panel-strong shadow-[0_24px_80px_rgba(24,32,28,0.10)] lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <Sparkles className="size-7 text-[#f29a7d]" />
          <div>
            <p className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.04em]">
              보고 싶은 장면과<br />들려주고 싶은 이야기를 한곳에.
            </p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              사진 한 장, 짧은 순간, 긴 기록까지 나만의 채널에서 시작하세요.
            </p>
          </div>
        </section>
        <section className="p-7 sm:p-12">
          <div className="flex rounded-xl bg-background p-1 text-sm font-semibold">
            {(["register", "login"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setMode(item); setError(""); }}
                className={`flex-1 rounded-lg py-2.5 transition ${mode === item ? "bg-white shadow-sm" : "text-muted"}`}
              >
                {item === "register" ? "가입하기" : "로그인"}
              </button>
            ))}
          </div>
          <h1 className="mt-8 text-2xl font-semibold tracking-[-0.03em]">
            {mode === "register" ? "새로운 채널을 만들어보세요" : "다시 만나서 반가워요"}
          </h1>
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "register" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="표시 이름" name="displayName" placeholder="홍길동" />
                <Field label="핸들" name="handle" placeholder="gildong.daily" />
              </div>
            )}
            <Field label="이메일" name="email" type="email" placeholder="you@example.com" />
            <Field label="비밀번호" name="password" type="password" placeholder="10자 이상 입력" minLength={10} />
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-white transition hover:bg-ink/90 disabled:opacity-50">
              {pending ? "처리 중…" : mode === "register" ? "채널 만들기" : "로그인"}
              {!pending && <ArrowRight className="size-4" />}
            </button>
          </form>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted"><LockKeyhole className="size-3.5" /> 비밀번호와 세션은 안전하게 암호화되어 관리됩니다.</p>
        </section>
      </div>
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input required {...props} className="mt-2 h-12 w-full rounded-xl border border-line bg-background px-4 outline-none transition focus:border-accent" />
    </label>
  );
}
