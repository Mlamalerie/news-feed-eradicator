import { SITE_ICONS } from "../site-icons";

// Brand colours that are (nearly) black would vanish on the dark theme, so those use the text colour.
const isDark = (hex: string) => {
	const n = parseInt(hex.slice(1), 16);
	const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
	return lum < 0.25;
};

export const SiteLogo = ({ siteId, size = 28 }: { siteId: string, size?: number }) => {
	const icon = SITE_ICONS[siteId];
	const box = { width: `${size}px`, height: `${size}px`, "flex-shrink": 0 };

	if (icon == null || icon.path == null) {
		const label = icon?.monogram ?? siteId.slice(0, 1).toUpperCase();
		return <span aria-hidden="true" style={{
			...box, display: 'inline-flex', "align-items": 'center', "justify-content": 'center',
			"border-radius": '6px', background: icon?.color ?? 'var(--theme-figure-500)', color: '#fff',
			"font-weight": 'bold', "font-size": `${Math.round(size * (label.length > 2 ? 0.34 : 0.45))}px`,
		}}>{label}</span>;
	}

	return <svg aria-hidden="true" viewBox="0 0 24 24" style={{ ...box, color: isDark(icon.color) ? 'var(--theme-figure)' : icon.color }} fill="currentColor">
		<path d={icon.path} />
	</svg>;
};
