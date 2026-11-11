// Hands every Call Coach request to the rockstar-ai-audit Worker, which serves everything under /coach.
export default {
	async fetch(request, env) {
		const { pathname } = new URL(request.url);
		if (pathname === '/coach' || pathname.startsWith('/coach/')) return env.COACH.fetch(request);
		return new Response('Not found', { status: 404 });
	}
};
