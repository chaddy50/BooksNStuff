import { Link } from "@tanstack/react-router";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/features/screens/auth/auth-client";

export function ForgotPasswordScreen() {
	const { t } = useTranslation();
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const emailInputId = useId();

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setIsSubmitting(true);

		try {
			await authClient.requestPasswordReset({
				email,
				redirectTo: "/reset-password",
			});
		} catch {
			// Same outcome either way, to avoid email enumeration.
		} finally {
			setIsSubmitted(true);
			setIsSubmitting(false);
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="w-full max-w-sm space-y-6 p-8 rounded-lg border border-border bg-card shadow-sm">
				<h1 className="text-2xl font-bold text-center">
					{t("auth.forgotPasswordTitle")}
				</h1>

				{isSubmitted ? (
					<div className="space-y-4">
						<p className="text-sm text-center text-muted-foreground">
							{t("auth.forgotPasswordSent")}
						</p>
						<p className="text-sm text-center">
							<Link
								to="/login"
								className="underline hover:text-foreground transition-colors text-muted-foreground"
							>
								{t("auth.backToSignIn")}
							</Link>
						</p>
					</div>
				) : (
					<>
						<p className="text-sm text-center text-muted-foreground">
							{t("auth.forgotPasswordDescription")}
						</p>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor={emailInputId}>{t("auth.email")}</Label>
								<Input
									id={emailInputId}
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									required
									autoComplete="email"
								/>
							</div>

							<Button type="submit" className="w-full" disabled={isSubmitting}>
								{isSubmitting ? "..." : t("auth.forgotPasswordSubmit")}
							</Button>
						</form>

						<p className="text-sm text-center text-muted-foreground">
							<Link
								to="/login"
								className="underline hover:text-foreground transition-colors"
							>
								{t("auth.backToSignIn")}
							</Link>
						</p>
					</>
				)}
			</div>
		</div>
	);
}
