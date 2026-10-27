/**
 * HighLevel contact custom fields in the Rockstar Designs sub account (hrsRmtnUmvqCKm3d01tx).
 * The ids come from HighLevel; the merge field for each one is {{contact.<key>}}.
 */
export const AUDIT_FIELDS = {
	business_type: { id: 'qTrpfO3A67HTN8ZgVcPO', key: 'ai_audit__business_type' },
	product_line: { id: 'FGmwnjZWroKe5C9HxOXU', key: 'ai_audit__product_line' },
	lead_sources: { id: 'v4rrPK1vnBRcBgJuYrDC', key: 'ai_audit__lead_sources' },
	after_hours_leads: { id: '6w8EtstXcfaL0MU83rSx', key: 'ai_audit__after_hours_leads' },
	lead_response_time: { id: 'NYNHmiMuehjUHc5yKIFJ', key: 'ai_audit__lead_response_time' },
	monthly_leads: { id: 'p8DIm0j6U5j6Vs3KE2Mh', key: 'ai_audit__monthly_leads' },
	monthly_closes: { id: '9NLqPhA5uD6Sn6zPECWE', key: 'ai_audit__monthly_closes' },
	average_customer_value: { id: '5CETiYu8atjF5Y7Qfyvx', key: 'ai_audit__average_customer_value' },
	follow_up_process: { id: 'HlRKhzj9f6rLCGnK910I', key: 'ai_audit__follow_up_process' },
	reviews: { id: 'suLMt2RYc6ws2yME5vzw', key: 'ai_audit__reviews' },
	biggest_time_drain: { id: 'hgerwklyGCBDN6noYjQl', key: 'ai_audit__biggest_time_drain' },
	current_tools_and_crm: { id: 'MHhI9u34GkoAHJ8Hn7so', key: 'ai_audit__current_tools_and_crm' },
	first_thing_to_hand_off: { id: 'y3fFsiB0uXBUpRmBN6cd', key: 'ai_audit__first_thing_to_hand_off' },
	what_has_held_them_back: { id: 'tCPS7EAVNqrkHmv6iyoP', key: 'ai_audit__what_has_held_them_back' },
	go_live_timeline: { id: 'K2zlp5IDNyxPgdPUOCef', key: 'ai_audit__go_live_timeline' },
	wants_strategy_call: { id: 'FHyRDsGjjKmCvvHHr7Qd', key: 'ai_audit__wants_strategy_call' },
	website_findings: { id: 'jSpIXPWgd0HDVqueq31y', key: 'ai_audit__website_findings' },
	summary: { id: 'Hp3C94k2OYbLBLtJ4zST', key: 'ai_audit__summary' },
	estimated_monthly_revenue_leak: { id: 'mqTTZHcXVmlPRsG6rX2G', key: 'ai_audit__estimated_monthly_revenue_leak' },
	opportunity_score: { id: 'SY2C6EELmEaQaCBgWXh9', key: 'ai_audit__opportunity_score' },
	recommended_path: { id: 'Z1jqPZQg92c4kQxSKu39', key: 'ai_audit__recommended_path' },
	recommended_tools: { id: '5w6t63kAmNlB3FB1qiCK', key: 'ai_audit__recommended_tools' },
	next_steps_for_mat: { id: 'r3B1UP6RUUcBJx8ACpqC', key: 'ai_audit__next_steps_for_mat' },
	prospect_email_subject: { id: 'xcNzAlWKG4VdAVIYflRC', key: 'ai_audit__prospect_email_subject' },
	prospect_email_body: { id: 'CkYybkChYi5FJaciyhse', key: 'ai_audit__prospect_email_draft' },
	transcript: { id: 'VQVuaJhacbw9Eu2UMmee', key: 'ai_audit__transcript' },
	completed_date: { id: 'VArbqme0Jk20OUg2KPJt', key: 'ai_audit__completed_date' }
} as const;

export type AuditFieldName = keyof typeof AUDIT_FIELDS;

export const TAG_STARTED = 'ai audit started';
export const TAG_COMPLETE = 'ai audit complete';
export const TAG_WANTS_CALL = 'ai audit wants call';
