/// <reference types="astro/client" />

interface ImportMetaEnv {
	readonly PUBLIC_GISCUS_REPO?: string;
	readonly PUBLIC_GISCUS_REPO_ID?: string;
	readonly PUBLIC_GISCUS_CATEGORY?: string;
	readonly PUBLIC_GISCUS_CATEGORY_ID?: string;
	/** Google Analytics 4 measurement ID (G-XXXXXXXX). Enables GA4 when set. */
	readonly PUBLIC_GA_MEASUREMENT_ID?: string;
}
