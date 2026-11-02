import { i as __toESM } from "../_runtime.mjs";
import { _t as stageLabel, gt as preparatoryGrade, mt as STREAMS, pt as GRADES, vt as validateDisplayName } from "./cn-Ccejyh36.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { T as require_jsx_runtime, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { d as useLocalLibrary, f as Button } from "./router-03i3X1Nd.mjs";
import { n as ChoiceGroup, r as Panel, t as ChoiceButton } from "./panel-B6qeBfmK.mjs";
import { r as TextInput, t as Field } from "./field-CPok0Yeo.mjs";
import { n as readSupabasePublicConfig, t as cloudLibraryStatus } from "./env-DEnVd4uS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/you-BUH9UY2L.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var cached = null;
var cachedUrl = "";
async function createSupabaseClient(config, options) {
	const persistSession = options?.persistSession ?? true;
	const { createClient } = await import("../_libs/supabase__supabase-js.mjs").then((n) => n.t);
	return createClient(config.url, config.anonKey, { auth: {
		persistSession,
		autoRefreshToken: persistSession,
		detectSessionInUrl: false
	} });
}
/**
* Returns the shared browser client when both public Supabase variables are
* set. Returns null when this installation is offline-only or misconfigured.
* Does not query tables and does not imply that sync is available.
*/
async function getSupabaseClient(env) {
	let config;
	try {
		config = readSupabasePublicConfig(env);
	} catch {
		return null;
	}
	if (!config) return null;
	if (env) return createSupabaseClient(config, { persistSession: false });
	if (!cached || cachedUrl !== config.url) {
		cached = await createSupabaseClient(config);
		cachedUrl = config.url;
	}
	return cached;
}
function YouPage() {
	const library = useLocalLibrary();
	const cloud = cloudLibraryStatus();
	(0, import_react.useEffect)(() => {
		if (cloud.state !== "ready") return;
		getSupabaseClient().catch(() => void 0);
	}, [cloud.state]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex max-w-2xl flex-col gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-serif text-4xl leading-tight text-ink",
					children: "You"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/misconceptions",
						className: "text-primary underline underline-offset-2",
						children: "Review learning support patterns"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-lg text-pretty text-muted",
					children: "This profile stays on this device. It is not an account, and it does not sign you in."
				})
			] }),
			library.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Opening your notebook…"
			}) : library.status === "error" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProfileForm, {
				profile: library.profile,
				onSave: library.saveProfile
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-serif text-3xl text-ink",
					children: "This installation"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-pretty text-muted",
					children: cloud.summary
				}),
				cloud.state === "ready" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm break-words text-muted",
					children: ["Host: ", cloud.host]
				}) : null,
				cloud.state === "misconfigured" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-pretty text-danger",
					children: cloud.detail
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm text-pretty text-muted",
					children: "Profile and notes are saved in this browser only. Sirius does not sync them in this release."
				})
			] })
		]
	});
}
function ProfileForm({ profile, onSave }) {
	const [name, setName] = (0, import_react.useState)(profile.displayName);
	const [grade, setGrade] = (0, import_react.useState)(profile.grade);
	const [stream, setStream] = (0, import_react.useState)(profile.stream);
	const [error, setError] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const streamsOpen = preparatoryGrade(grade);
	const profileStamp = (0, import_react.useRef)(profile.updatedAt);
	(0, import_react.useEffect)(() => {
		if (profile.updatedAt === profileStamp.current) return;
		profileStamp.current = profile.updatedAt;
		setName(profile.displayName);
		setGrade(profile.grade);
		setStream(profile.stream);
	}, [
		profile.updatedAt,
		profile.displayName,
		profile.grade,
		profile.stream
	]);
	function selectGrade(next) {
		setGrade(next);
		if (!preparatoryGrade(next)) setStream(null);
		setMessage(null);
	}
	async function onSubmit(event) {
		event.preventDefault();
		const nameError = validateDisplayName(name);
		if (nameError) {
			setError(nameError);
			setMessage(null);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await onSave({
				displayName: name,
				grade,
				stream: streamsOpen ? stream : null,
				updatedAt: profile.updatedAt
			});
			setMessage("Saved on this device.");
		} catch (saveError) {
			setMessage(null);
			setError(saveError instanceof Error ? saveError.message : "Could not save on this device.");
		} finally {
			setSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "flex flex-col gap-6",
		onSubmit,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-serif text-3xl text-ink",
				children: "Learner"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-pretty text-muted",
				children: stageLabel(grade, streamsOpen ? stream : null)
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Name",
				htmlFor: "learner-name",
				hint: "Optional. Shown on your home screen.",
				error,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextInput, {
					id: "learner-name",
					name: "name",
					autoComplete: "name",
					value: name,
					maxLength: 80,
					onChange: (event) => {
						setName(event.target.value);
						setError(null);
						setMessage(null);
					}
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChoiceGroup, {
				legend: "Grade",
				columnsClassName: "sm:grid-cols-4",
				children: GRADES.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ChoiceButton, {
					pressed: grade === item,
					onClick: () => selectGrade(item),
					children: ["Grade ", item]
				}, item))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChoiceGroup, {
				legend: "Stream",
				hint: streamsOpen ? "Preparatory school uses two streams." : "Streams start in Grade 11.",
				children: STREAMS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChoiceButton, {
					pressed: stream === item.id,
					disabled: !streamsOpen,
					onClick: () => {
						setStream(stream === item.id ? null : item.id);
						setMessage(null);
					},
					children: item.label
				}, item.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: saving,
					children: saving ? "Saving…" : "Save profile"
				}), message ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "status",
					className: "text-sm text-primary",
					children: message
				}) : null]
			})
		]
	}) });
}
var SplitComponent = YouPage;
//#endregion
export { SplitComponent as component };
