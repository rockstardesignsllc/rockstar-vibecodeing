import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { motion, useInView } from 'framer-motion';
import {
	ArrowRight,
	ChevronDown,
	Github,
	Zap,
	Code2,
	Globe,
	Layers,
	GitBranch,
	Cpu,
	Eye,
	Terminal,
	Rocket,
	Check,
	Star,
} from 'lucide-react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { useAuthGuard } from '../../hooks/useAuthGuard';
import type { AgentMode } from '../../components/agent-mode-toggle';
import { AgentModeToggle } from '../../components/agent-mode-toggle';
import { useAuth } from '../../contexts/auth-context';
import { AuthButton } from '../../components/auth/auth-button';

/* ─── Design tokens ──────────────────────────────────────── */
const C = {
	bg: '#070707',
	surface: '#111111',
	card: '#141414',
	border: 'rgba(255,255,255,0.07)',
	borderAccent: 'rgba(255,61,0,0.3)',
	accent: '#ff3d00',
	orange: '#f6821f',
	white: '#ffffff',
	muted: 'rgba(255,255,255,0.55)',
	faint: 'rgba(255,255,255,0.25)',
} as const;

/* ─── Animation variants ─────────────────────────────────── */
const fadeUp = {
	hidden: { opacity: 0, y: 24 },
	visible: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
	},
};

const stagger = {
	visible: { transition: { staggerChildren: 0.1 } },
};

function AnimateWhenVisible({ children, className }: { children: React.ReactNode; className?: string }) {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, margin: '-80px' });
	return (
		<motion.div
			ref={ref}
			variants={fadeUp}
			initial="hidden"
			animate={inView ? 'visible' : 'hidden'}
			className={className}
		>
			{children}
		</motion.div>
	);
}

function AnimateStagger({ children, className }: { children: React.ReactNode; className?: string }) {
	const ref = useRef(null);
	const inView = useInView(ref, { once: true, margin: '-80px' });
	return (
		<motion.div
			ref={ref}
			variants={stagger}
			initial="hidden"
			animate={inView ? 'visible' : 'hidden'}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/* ─── Nav ────────────────────────────────────────────────── */
function Nav() {
	const { user } = useAuth();
	return (
		<nav
			style={{
				borderBottom: `1px solid ${C.border}`,
				background: 'rgba(7,7,7,0.85)',
				backdropFilter: 'blur(12px)',
				WebkitBackdropFilter: 'blur(12px)',
			}}
			className="w-full z-40"
		>
			<div
				className="max-w-6xl mx-auto px-6 flex items-center justify-between"
				style={{ height: 68 }}
			>
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2.5 no-underline">
					<div
						className="flex items-center justify-center rounded-lg"
						style={{
							width: 34,
							height: 34,
							background: `linear-gradient(135deg, ${C.accent} 0%, ${C.orange} 100%)`,
							boxShadow: `0 0 20px rgba(255,61,0,0.35)`,
						}}
					>
						<Zap size={18} color="#fff" strokeWidth={2.5} />
					</div>
					<span
						className="font-semibold tracking-tight"
						style={{ fontSize: 18, color: C.white, letterSpacing: '-0.02em' }}
					>
						Rockstar
					</span>
				</Link>

				{/* Links */}
				<div className="hidden md:flex items-center gap-8">
					{['Features', 'How it works', 'Open Source'].map((item) => (
						<a
							key={item}
							href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
							className="transition-colors duration-200 no-underline"
							style={{ fontSize: 14, color: C.muted, fontWeight: 500 }}
							onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
							onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
						>
							{item}
						</a>
					))}
				</div>

				{/* CTA */}
				<div className="flex items-center gap-3">
					{user ? (
						<Link
							to="/create"
							className="flex items-center gap-1.5 font-semibold rounded-full no-underline transition-all duration-200 hover:opacity-90"
							style={{
								background: `linear-gradient(135deg, ${C.accent} 0%, ${C.orange} 100%)`,
								color: '#fff',
								fontSize: 14,
								padding: '8px 20px',
								boxShadow: `0 0 20px rgba(255,61,0,0.3)`,
							}}
						>
							Open app <ArrowRight size={14} />
						</Link>
					) : (
						<>
							<AuthButton />
						</>
					)}
				</div>
			</div>
		</nav>
	);
}

/* ─── Hero ───────────────────────────────────────────────── */
function Hero() {
	const navigate = useNavigate();
	const { requireAuth } = useAuthGuard();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [agentMode, setAgentMode] = useState<AgentMode>('deterministic');

	const placeholderPhrases = useMemo(
		() => ['todo list app', 'F1 fantasy game', 'personal finance tracker', 'Kanban board', 'AI chatbot'],
		[],
	);
	const [phraseIndex, setPhraseIndex] = useState(0);
	const [placeholderText, setPlaceholderText] = useState('');
	const [isTyping, setIsTyping] = useState(true);

	useEffect(() => {
		const phrase = placeholderPhrases[phraseIndex];
		if (isTyping) {
			if (placeholderText.length < phrase.length) {
				const t = setTimeout(() => setPlaceholderText(phrase.slice(0, placeholderText.length + 1)), 90);
				return () => clearTimeout(t);
			} else {
				const t = setTimeout(() => setIsTyping(false), 2000);
				return () => clearTimeout(t);
			}
		} else {
			if (placeholderText.length > 0) {
				const t = setTimeout(() => setPlaceholderText(placeholderText.slice(0, -1)), 45);
				return () => clearTimeout(t);
			} else {
				setPhraseIndex((p) => (p + 1) % placeholderPhrases.length);
				setIsTyping(true);
			}
		}
	}, [placeholderText, phraseIndex, isTyping, placeholderPhrases]);

	const adjustHeight = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 260) + 'px';
		}
	}, []);

	const handleSubmit = useCallback(
		(query: string) => {
			const encodedQuery = encodeURIComponent(query);
			const encodedMode = encodeURIComponent(agentMode);
			const intendedUrl = `/chat/new?query=${encodedQuery}&agentMode=${encodedMode}`;
			if (!requireAuth({ requireFullAuth: true, actionContext: 'to create applications', intendedUrl })) return;
			navigate(intendedUrl);
		},
		[agentMode, navigate, requireAuth],
	);

	return (
		<section
			style={{ background: C.bg, minHeight: 'calc(100vh - 68px)', position: 'relative', overflow: 'hidden' }}
			className="flex flex-col items-center justify-center px-6 py-24"
		>
			{/* Dot grid background */}
			<div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
				<svg width="100%" height="100%">
					<defs>
						<pattern id="dots" viewBox="-6 -6 12 12" patternUnits="userSpaceOnUse" width="28" height="28">
							<circle cx="0" cy="0" r="0.8" fill="rgba(255,61,0,0.5)" />
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#dots)" />
				</svg>
			</div>

			{/* Radial glow */}
			<div
				className="absolute pointer-events-none"
				style={{
					top: '30%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					width: 900,
					height: 500,
					background: `radial-gradient(ellipse at center, rgba(255,61,0,0.13) 0%, rgba(246,130,31,0.06) 40%, transparent 70%)`,
					filter: 'blur(40px)',
				}}
			/>

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto">
				{/* Eyebrow */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="flex items-center gap-2 mb-6"
				>
					<div
						className="flex items-center gap-2 rounded-full px-4 py-1.5"
						style={{
							border: `1px solid ${C.borderAccent}`,
							background: 'rgba(255,61,0,0.08)',
							fontSize: 13,
							color: C.orange,
							fontWeight: 500,
							letterSpacing: '0.04em',
						}}
					>
						<span
							className="inline-block rounded-full"
							style={{ width: 6, height: 6, background: C.accent, boxShadow: `0 0 8px ${C.accent}` }}
						/>
						Open source · Cloudflare-powered · Free to deploy
					</div>
				</motion.div>

				{/* Headline */}
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
					style={{
						fontSize: 'clamp(48px, 6vw, 76px)',
						fontWeight: 600,
						lineHeight: 1.08,
						letterSpacing: '-0.04em',
						color: C.white,
						marginBottom: 20,
						paddingBottom: '0.15em',
					}}
				>
					Build any web app
					<br />
					<span
						style={{
							background: `linear-gradient(90deg, ${C.accent} 0%, ${C.orange} 100%)`,
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text',
							display: 'inline-block',
							paddingBottom: '0.18em',
						}}
					>
						you can imagine.
					</span>
				</motion.h1>

				{/* Sub */}
				<motion.p
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.55, delay: 0.18 }}
					style={{ fontSize: 18, lineHeight: 1.65, color: C.muted, maxWidth: 540, marginBottom: 40 }}
				>
					Describe it in plain English. Our AI builds it phase by phase — real code, live preview, one-click
					Cloudflare deploy.
				</motion.p>

				{/* Prompt box */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.26 }}
					className="w-full"
					style={{ maxWidth: 640 }}
				>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSubmit(textareaRef.current?.value ?? '');
						}}
						style={{
							background: C.surface,
							border: `1px solid rgba(255,61,0,0.25)`,
							borderRadius: 16,
							padding: '20px 20px 16px',
							boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 24px 48px rgba(0,0,0,0.4), 0 0 80px rgba(255,61,0,0.06)`,
						}}
					>
						<textarea
							ref={textareaRef}
							name="query"
							placeholder={`Create a ${placeholderText}`}
							onChange={adjustHeight}
							onInput={adjustHeight}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									handleSubmit(textareaRef.current?.value ?? '');
								}
							}}
							style={{
								width: '100%',
								minHeight: 56,
								resize: 'none',
								outline: 'none',
								background: 'transparent',
								border: 'none',
								color: C.white,
								fontSize: 16,
								lineHeight: 1.6,
								fontFamily: 'inherit',
							}}
						/>
						<div className="flex items-center justify-between mt-3">
							{import.meta.env.VITE_AGENT_MODE_ENABLED ? (
								<AgentModeToggle value={agentMode} onChange={setAgentMode} className="flex-1" />
							) : (
								<div />
							)}
							<button
								type="submit"
								className="flex items-center gap-2 rounded-full font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
								style={{
									background: `linear-gradient(135deg, ${C.accent} 0%, ${C.orange} 100%)`,
									color: '#fff',
									fontSize: 14,
									padding: '9px 20px',
									boxShadow: `0 0 20px rgba(255,61,0,0.35)`,
									marginLeft: 12,
								}}
							>
								Build it <ArrowRight size={14} />
							</button>
						</div>
					</form>
				</motion.div>

				{/* Trust pill */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.45 }}
					className="flex items-center gap-6 mt-8"
				>
					<div className="flex items-center gap-1.5" style={{ fontSize: 13, color: C.muted }}>
						{[...Array(5)].map((_, i) => (
							<Star key={i} size={12} fill={C.accent} color={C.accent} />
						))}
						<span className="ml-1">4.9 · 1,200+ apps built</span>
					</div>
					<div style={{ width: 1, height: 16, background: C.border }} />
					<div className="flex items-center gap-1.5" style={{ fontSize: 13, color: C.muted }}>
						<Check size={12} color={C.accent} />
						Free to deploy
					</div>
					<div style={{ width: 1, height: 16, background: C.border }} />
					<div className="flex items-center gap-1.5" style={{ fontSize: 13, color: C.muted }}>
						<Github size={12} />
						Open source
					</div>
				</motion.div>
			</div>
		</section>
	);
}

/* ─── Trust strip ────────────────────────────────────────── */
function TrustStrip() {
	const items = [
		'1,200+ apps built',
		'Powered by Claude & GPT-4o',
		'Cloudflare edge · 300+ locations',
		'Open source on GitHub',
		'No lock-in · full code export',
		'Phase-wise AI generation',
		'Real-time live preview',
		'Deploy in under 60 seconds',
	];

	return (
		<div
			style={{
				borderTop: `1px solid ${C.border}`,
				borderBottom: `1px solid ${C.border}`,
				background: C.surface,
				overflow: 'hidden',
				padding: '14px 0',
			}}
		>
			<style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0) }
          to { transform: translateX(-50%) }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 28s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
			<div className="marquee-track">
				{[...items, ...items].map((item, i) => (
					<div key={i} className="flex items-center gap-4 px-8 whitespace-nowrap">
						<span
							className="inline-block rounded-full"
							style={{ width: 4, height: 4, background: C.accent, flexShrink: 0 }}
						/>
						<span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>{item}</span>
					</div>
				))}
			</div>
		</div>
	);
}

/* ─── How it works ───────────────────────────────────────── */
function HowItWorks() {
	const steps = [
		{
			icon: <Terminal size={22} color={C.accent} strokeWidth={1.8} />,
			eyebrow: 'Step one',
			title: 'Describe your idea',
			body: 'Type what you want to build in plain English. The more specific you are, the more accurate the result. No code required.',
		},
		{
			icon: <Eye size={22} color={C.accent} strokeWidth={1.8} />,
			eyebrow: 'Step two',
			title: 'Watch it build live',
			body: 'AI generates your app phase by phase — frontend, backend, database. Live preview updates in real-time as the code streams in.',
		},
		{
			icon: <Rocket size={22} color={C.accent} strokeWidth={1.8} />,
			eyebrow: 'Step three',
			title: 'Ship it instantly',
			body: 'One click deploys to Cloudflare\'s global edge network. Your app goes live in seconds, available worldwide.',
		},
	];

	return (
		<section
			id="how-it-works"
			style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
			className="px-6 py-24"
		>
			<div className="max-w-6xl mx-auto">
				<AnimateWhenVisible className="text-center mb-16">
					<div
						className="inline-block mb-4"
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.12em',
							color: C.accent,
							textTransform: 'uppercase',
						}}
					>
						Simple by design
					</div>
					<h2
						style={{
							fontSize: 'clamp(32px, 4vw, 48px)',
							fontWeight: 600,
							letterSpacing: '-0.03em',
							lineHeight: 1.15,
							color: C.white,
							marginBottom: 16,
						}}
					>
						From idea to shipped app
						<br />
						in three steps.
					</h2>
					<p style={{ fontSize: 17, color: C.muted, maxWidth: 480, margin: '0 auto' }}>
						No boilerplate. No DevOps. No waiting for a developer.
					</p>
				</AnimateWhenVisible>

				<AnimateStagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
					{steps.map((step, i) => (
						<motion.div
							key={i}
							variants={fadeUp}
							className="relative"
							style={{
								background: C.card,
								border: `1px solid ${C.border}`,
								borderRadius: 16,
								padding: '32px 28px',
								transition: 'border-color 0.2s',
							}}
							whileHover={{ borderColor: C.borderAccent, y: -3 }}
						>
							<div
								className="flex items-center justify-center rounded-xl mb-6"
								style={{ width: 48, height: 48, background: 'rgba(255,61,0,0.1)', border: `1px solid rgba(255,61,0,0.2)` }}
							>
								{step.icon}
							</div>
							<div
								style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: C.accent, textTransform: 'uppercase', marginBottom: 8 }}
							>
								{step.eyebrow}
							</div>
							<h3
								style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: C.white, marginBottom: 12, lineHeight: 1.3 }}
							>
								{step.title}
							</h3>
							<p style={{ fontSize: 15, lineHeight: 1.65, color: C.muted }}>{step.body}</p>
						</motion.div>
					))}
				</AnimateStagger>
			</div>
		</section>
	);
}

/* ─── Features bento ─────────────────────────────────────── */
function FeaturesBento() {
	const features = [
		{
			icon: <Cpu size={24} color={C.accent} strokeWidth={1.7} />,
			title: 'Phase-wise AI generation',
			body: 'Structured code output, not random files. Each phase builds on the last — blueprint, frontend, backend, database — for apps that actually work.',
			span: { col: '1 / 8', row: '1 / 3' },
			large: true,
		},
		{
			icon: <Eye size={22} color={C.orange} strokeWidth={1.7} />,
			title: 'Real-time live preview',
			body: 'Watch your app take shape as AI streams the code. Instant browser preview on every save.',
			span: { col: '8 / 13', row: '1 / 2' },
		},
		{
			icon: <Globe size={22} color={C.orange} strokeWidth={1.7} />,
			title: 'One-click Cloudflare deploy',
			body: 'Ship to 300+ global edge locations with zero config. Sub-50ms latency worldwide.',
			span: { col: '8 / 13', row: '2 / 3' },
		},
		{
			icon: <Layers size={22} color={C.accent} strokeWidth={1.7} />,
			title: 'Multi-model AI',
			body: 'Claude 3.7, GPT-4o, Gemini 1.5 Pro — choose your model and switch mid-session.',
			span: { col: '1 / 5', row: '3 / 4' },
		},
		{
			icon: <GitBranch size={22} color={C.accent} strokeWidth={1.7} />,
			title: 'Full code ownership',
			body: 'Export to GitHub with one click. No lock-in. Real, readable code — always yours.',
			span: { col: '5 / 9', row: '3 / 4' },
		},
		{
			icon: <Code2 size={22} color={C.accent} strokeWidth={1.7} />,
			title: 'Open standards output',
			body: 'Plain HTML, CSS, JS, React, or whatever fits. No proprietary runtime, no surprise dependencies.',
			span: { col: '9 / 13', row: '3 / 4' },
		},
	];

	return (
		<section
			id="features"
			style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
			className="px-6 py-24"
		>
			<div className="max-w-6xl mx-auto">
				<AnimateWhenVisible className="text-center mb-16">
					<div
						style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: C.accent, textTransform: 'uppercase', marginBottom: 16 }}
					>
						Platform capabilities
					</div>
					<h2
						style={{
							fontSize: 'clamp(32px, 4vw, 48px)',
							fontWeight: 600,
							letterSpacing: '-0.03em',
							lineHeight: 1.15,
							color: C.white,
							marginBottom: 16,
						}}
					>
						Everything you need to
						<br />
						go from prompt to production.
					</h2>
				</AnimateWhenVisible>

				<AnimateWhenVisible>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(12, 1fr)',
							gridTemplateRows: 'repeat(3, auto)',
							gap: 16,
						}}
					>
						{features.map((f, i) => (
							<motion.div
								key={i}
								style={{
									gridColumn: f.span.col,
									gridRow: f.span.row,
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 16,
									padding: f.large ? '36px 32px' : '28px 24px',
									display: 'flex',
									flexDirection: 'column',
									gap: 14,
									transition: 'border-color 0.2s',
								}}
								whileHover={{ borderColor: C.borderAccent }}
							>
								<div
									className="flex items-center justify-center rounded-xl"
									style={{
										width: f.large ? 56 : 44,
										height: f.large ? 56 : 44,
										background: 'rgba(255,61,0,0.08)',
										border: `1px solid rgba(255,61,0,0.15)`,
										flexShrink: 0,
									}}
								>
									{f.icon}
								</div>
								<div>
									<h3
										style={{
											fontSize: f.large ? 22 : 17,
											fontWeight: 600,
											letterSpacing: '-0.02em',
											color: C.white,
											lineHeight: 1.3,
											marginBottom: 8,
										}}
									>
										{f.title}
									</h3>
									<p style={{ fontSize: f.large ? 16 : 14, lineHeight: 1.65, color: C.muted }}>{f.body}</p>
								</div>
							</motion.div>
						))}
					</div>
				</AnimateWhenVisible>
			</div>
		</section>
	);
}

/* ─── Testimonials ───────────────────────────────────────── */
function Testimonials() {
	const testimonials = [
		{
			quote: "Built my SaaS MVP in 45 minutes. Would have taken me three weeks solo. The phase-by-phase approach means the code is actually clean — not slop.",
			name: 'Sarah Kim',
			role: 'Indie Hacker & Founder',
			avatar: 'https://i.pravatar.cc/80?img=47',
			stars: 5,
		},
		{
			quote: "We prototype with Rockstar now. It's 10× faster than our usual workflow. Every sprint kickoff starts with a live demo built in the meeting.",
			name: 'Marcus Torres',
			role: 'CTO, Finlify',
			avatar: 'https://i.pravatar.cc/80?img=11',
			stars: 5,
		},
		{
			quote: "I'm not a developer. Rockstar lets me build internal tools for my team without waiting weeks for engineering bandwidth. Game-changing autonomy.",
			name: 'Priya Sharma',
			role: 'Head of Product, Liveblocks',
			avatar: 'https://i.pravatar.cc/80?img=45',
			stars: 5,
		},
	];

	return (
		<section
			style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}
			className="px-6 py-24"
		>
			<div className="max-w-6xl mx-auto">
				<AnimateWhenVisible className="text-center mb-16">
					<div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: C.accent, textTransform: 'uppercase', marginBottom: 16 }}>
						What builders say
					</div>
					<h2
						style={{ fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, color: C.white }}
					>
						Builders who ship faster.
					</h2>
				</AnimateWhenVisible>

				<AnimateStagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{testimonials.map((t, i) => (
						<motion.div
							key={i}
							variants={fadeUp}
							style={{
								background: C.card,
								border: `1px solid ${C.border}`,
								borderRadius: 16,
								padding: '28px 28px 24px',
								display: 'flex',
								flexDirection: 'column',
								gap: 20,
							}}
							whileHover={{ borderColor: C.borderAccent }}
						>
							<div className="flex gap-1">
								{[...Array(t.stars)].map((_, si) => (
									<Star key={si} size={14} fill={C.accent} color={C.accent} />
								))}
							</div>
							<p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', flex: 1 }}>
								"{t.quote}"
							</p>
							<div className="flex items-center gap-3">
								<img
									src={t.avatar}
									alt={t.name}
									style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
								/>
								<div>
									<div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{t.name}</div>
									<div style={{ fontSize: 12, color: C.muted }}>{t.role}</div>
								</div>
							</div>
						</motion.div>
					))}
				</AnimateStagger>
			</div>
		</section>
	);
}

/* ─── Open source section ────────────────────────────────── */
function OpenSourceSection() {
	return (
		<section
			id="open-source"
			style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}
			className="px-6 py-24"
		>
			<div className="max-w-6xl mx-auto">
				<AnimateWhenVisible>
					<div
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 20,
							padding: '56px 48px',
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 48,
							alignItems: 'center',
						}}
					>
						<div>
							<div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: C.accent, textTransform: 'uppercase', marginBottom: 16 }}>
								Fully open source
							</div>
							<h2
								style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.2, color: C.white, marginBottom: 20 }}
							>
								Deploy your own
								<br />
								vibe-coding platform.
							</h2>
							<p style={{ fontSize: 16, lineHeight: 1.7, color: C.muted, marginBottom: 32 }}>
								Bring your own API keys. Fork the repo, click deploy, and have your own AI app builder
								running on Cloudflare Workers in minutes. MIT licensed.
							</p>
							<div className="flex flex-wrap gap-3">
								<motion.button
									onClick={() => window.open('https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/vibesdk', '_blank')}
									className="flex items-center gap-2 font-semibold rounded-full"
									style={{
										background: `linear-gradient(135deg, ${C.accent} 0%, ${C.orange} 100%)`,
										color: '#fff',
										fontSize: 14,
										padding: '10px 24px',
										boxShadow: `0 0 24px rgba(255,61,0,0.3)`,
										cursor: 'pointer',
										border: 'none',
									}}
									whileHover={{ scale: 1.03, boxShadow: `0 0 32px rgba(255,61,0,0.45)` }}
									whileTap={{ scale: 0.98 }}
								>
									<Zap size={15} /> Deploy to Cloudflare
								</motion.button>
								<motion.button
									onClick={() => window.open('https://github.com/cloudflare/vibesdk', '_blank')}
									className="flex items-center gap-2 font-semibold rounded-full"
									style={{
										background: 'transparent',
										border: `1px solid ${C.border}`,
										color: C.white,
										fontSize: 14,
										padding: '10px 24px',
										cursor: 'pointer',
									}}
									whileHover={{ borderColor: 'rgba(255,255,255,0.35)' }}
									whileTap={{ scale: 0.98 }}
								>
									<Github size={15} /> Fork on GitHub
								</motion.button>
							</div>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
							{[
								{ icon: <Check size={16} color={C.accent} />, label: 'MIT Licensed' },
								{ icon: <Check size={16} color={C.accent} />, label: 'Bring your own keys' },
								{ icon: <Check size={16} color={C.accent} />, label: 'Self-hostable' },
								{ icon: <Check size={16} color={C.accent} />, label: 'No vendor lock-in' },
								{ icon: <Check size={16} color={C.accent} />, label: 'Cloudflare Workers' },
								{ icon: <Check size={16} color={C.accent} />, label: 'Full source access' },
							].map((item, i) => (
								<div
									key={i}
									className="flex items-center gap-2.5"
									style={{
										background: 'rgba(255,61,0,0.05)',
										border: `1px solid rgba(255,61,0,0.12)`,
										borderRadius: 10,
										padding: '12px 14px',
									}}
								>
									{item.icon}
									<span style={{ fontSize: 13, fontWeight: 500, color: C.white }}>{item.label}</span>
								</div>
							))}
						</div>
					</div>
				</AnimateWhenVisible>
			</div>
		</section>
	);
}

/* ─── FAQ ─────────────────────────────────────────────────── */
function FAQ() {
	const items = [
		{
			q: 'Do I need to know how to code?',
			a: 'Not at all. Describe what you want in plain English and Rockstar handles the code. If you do know code, you can edit the output directly inside the built-in Monaco editor.',
		},
		{
			q: 'What kinds of apps can I build?',
			a: 'Dashboards, SaaS tools, landing pages, games, data visualizers, internal tools, AI chatbots — anything that runs in a browser. If you can describe it, we can build it.',
		},
		{
			q: 'Which AI models does Rockstar support?',
			a: 'Claude 3.5/3.7 Sonnet, GPT-4o, and Gemini 1.5 Pro. You choose which model powers your session and can switch at any time.',
		},
		{
			q: 'How does deployment work?',
			a: 'Every app deploys to Cloudflare Workers — 300+ global locations, sub-50ms latency worldwide. No servers to manage, no DevOps knowledge required.',
		},
		{
			q: 'Is Rockstar really free and open source?',
			a: 'Yes. The platform is fully open source under the MIT license. Bring your own AI API keys and deploy your own instance, or use ours. No paywalls on the core functionality.',
		},
		{
			q: 'Who owns the code I build?',
			a: 'You do. All generated code is yours entirely. Export to GitHub anytime with one click. There are no licensing restrictions on your output.',
		},
	];

	return (
		<section style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }} className="px-6 py-24">
			<div className="max-w-3xl mx-auto">
				<AnimateWhenVisible className="text-center mb-16">
					<div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: C.accent, textTransform: 'uppercase', marginBottom: 16 }}>
						Common questions
					</div>
					<h2
						style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, color: C.white }}
					>
						Everything you need to know.
					</h2>
				</AnimateWhenVisible>

				<AnimateWhenVisible>
					<AccordionPrimitive.Root type="single" collapsible style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{items.map((item, i) => (
							<AccordionPrimitive.Item
								key={i}
								value={`item-${i}`}
								style={{
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 12,
									overflow: 'hidden',
								}}
							>
								<AccordionPrimitive.Header>
									<AccordionPrimitive.Trigger
										className="flex w-full items-center justify-between gap-4 group"
										style={{
											padding: '20px 24px',
											fontSize: 16,
											fontWeight: 500,
											color: C.white,
											background: 'transparent',
											border: 'none',
											cursor: 'pointer',
											textAlign: 'left',
										}}
									>
										{item.q}
										<ChevronDown
											size={18}
											color={C.muted}
											style={{
												flexShrink: 0,
												transition: 'transform 0.25s ease',
											}}
											className="group-data-[state=open]:rotate-180"
										/>
									</AccordionPrimitive.Trigger>
								</AccordionPrimitive.Header>
								<AccordionPrimitive.Content
									style={{
										overflow: 'hidden',
									}}
									className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up"
								>
									<div style={{ padding: '0 24px 20px', fontSize: 15, lineHeight: 1.7, color: C.muted }}>
										{item.a}
									</div>
								</AccordionPrimitive.Content>
							</AccordionPrimitive.Item>
						))}
					</AccordionPrimitive.Root>
				</AnimateWhenVisible>
			</div>
		</section>
	);
}

/* ─── Final CTA ──────────────────────────────────────────── */
function FinalCTA() {
	const navigate = useNavigate();
	const { requireAuth } = useAuthGuard();

	const handleStart = () => {
		if (!requireAuth({ requireFullAuth: true, actionContext: 'to start building', intendedUrl: '/create' })) return;
		navigate('/create');
	};

	return (
		<section style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }} className="px-6 py-24">
			<div className="max-w-4xl mx-auto text-center">
				<AnimateWhenVisible>
					<div
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 24,
							padding: '64px 48px',
							position: 'relative',
							overflow: 'hidden',
						}}
					>
						{/* Glow */}
						<div
							style={{
								position: 'absolute',
								top: '-40%',
								left: '50%',
								transform: 'translateX(-50%)',
								width: 600,
								height: 300,
								background: `radial-gradient(ellipse at center, rgba(255,61,0,0.12) 0%, transparent 70%)`,
								filter: 'blur(30px)',
								pointerEvents: 'none',
							}}
						/>

						<div style={{ position: 'relative', zIndex: 1 }}>
							<div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', color: C.accent, textTransform: 'uppercase', marginBottom: 20 }}>
								Start for free today
							</div>
							<h2
								style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.1, color: C.white, marginBottom: 20 }}
							>
								Your next app starts
								<br />
								with one sentence.
							</h2>
							<p style={{ fontSize: 17, color: C.muted, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>
								No credit card. No setup. Just describe what you want to build.
							</p>
							<motion.button
								onClick={handleStart}
								className="inline-flex items-center gap-2 font-semibold rounded-full"
								style={{
									background: `linear-gradient(135deg, ${C.accent} 0%, ${C.orange} 100%)`,
									color: '#fff',
									fontSize: 16,
									padding: '14px 32px',
									boxShadow: `0 0 32px rgba(255,61,0,0.35)`,
									cursor: 'pointer',
									border: 'none',
								}}
								whileHover={{ scale: 1.04, boxShadow: `0 0 48px rgba(255,61,0,0.5)` }}
								whileTap={{ scale: 0.97 }}
							>
								Start building for free <ArrowRight size={16} />
							</motion.button>
						</div>
					</div>
				</AnimateWhenVisible>
			</div>
		</section>
	);
}

type FooterLink = { label: string; href: string; external?: boolean };
type FooterCol = { heading: string; links: FooterLink[] };

/* ─── Footer ─────────────────────────────────────────────── */
function Footer() {
	const year = new Date().getFullYear();
	const cols: FooterCol[] = [
		{
			heading: 'Product',
			links: [
				{ label: 'Features', href: '#features' },
				{ label: 'How it works', href: '#how-it-works' },
				{ label: 'Open Source', href: '#open-source' },
				{ label: 'Start building', href: '/create' },
			],
		},
		{
			heading: 'Resources',
			links: [
				{ label: 'GitHub', href: 'https://github.com/cloudflare/vibesdk', external: true },
				{ label: 'Deploy to Cloudflare', href: 'https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/vibesdk', external: true },
				{ label: 'Cloudflare Workers', href: 'https://workers.cloudflare.com', external: true },
			],
		},
		{
			heading: 'Legal',
			links: [
				{ label: 'MIT License', href: 'https://github.com/cloudflare/vibesdk/blob/main/LICENSE', external: true },
			],
		},
	];

	return (
		<footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }} className="px-6 pt-16 pb-10">
			<div className="max-w-6xl mx-auto">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
					{/* Brand */}
					<div className="col-span-2 md:col-span-1">
						<div className="flex items-center gap-2.5 mb-4">
							<div
								className="flex items-center justify-center rounded-lg"
								style={{
									width: 32,
									height: 32,
									background: `linear-gradient(135deg, ${C.accent} 0%, ${C.orange} 100%)`,
								}}
							>
								<Zap size={16} color="#fff" strokeWidth={2.5} />
							</div>
							<span style={{ fontSize: 17, fontWeight: 600, color: C.white, letterSpacing: '-0.02em' }}>
								Rockstar
							</span>
						</div>
						<p style={{ fontSize: 13, lineHeight: 1.65, color: C.muted, maxWidth: 220 }}>
							AI-powered app builder on Cloudflare Workers. Open source. Ship faster.
						</p>
					</div>

					{/* Link columns */}
					{cols.map((col) => (
						<div key={col.heading}>
							<div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: C.faint, textTransform: 'uppercase', marginBottom: 16 }}>
								{col.heading}
							</div>
							<div className="flex flex-col gap-3">
								{col.links.map((link) => (
									<a
										key={link.label}
										href={link.href}
										target={link.external ? '_blank' : undefined}
										rel={link.external ? 'noopener noreferrer' : undefined}
										style={{ fontSize: 14, color: C.muted, textDecoration: 'none', transition: 'color 0.15s' }}
										onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
										onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
									>
										{link.label}
									</a>
								))}
							</div>
						</div>
					))}
				</div>

				<div
					style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
				>
					<span style={{ fontSize: 13, color: C.faint }}>© {year} Rockstar. Built on Cloudflare Workers.</span>
					<span style={{ fontSize: 13, color: C.faint }}>Open source under the MIT License.</span>
				</div>
			</div>
		</footer>
	);
}

/* ─── Landing page ───────────────────────────────────────── */
export default function Landing() {
	return (
		<div style={{ background: C.bg, fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
			<Nav />
			<Hero />
			<TrustStrip />
			<HowItWorks />
			<FeaturesBento />
			<Testimonials />
			<OpenSourceSection />
			<FAQ />
			<FinalCTA />
			<Footer />
		</div>
	);
}
