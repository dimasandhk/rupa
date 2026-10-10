import type { PageTransition, TransitionDirection, TransitionType } from '../model/types';

export const TRANSITION_LABELS: Record<TransitionType, string> = {
	none: 'None',
	fade: 'Fade',
	slide: 'Slide',
	circle: 'Circle wipe',
	colorwipe: 'Color wipe',
	linewipe: 'Line wipe',
	flow: 'Flow',
	stack: 'Stack'
};

/** Types whose look depends on a direction. */
export const DIRECTIONAL: ReadonlySet<TransitionType> = new Set([
	'slide',
	'colorwipe',
	'linewipe',
	'flow',
	'stack'
]);

export const DEFAULT_TRANSITION: PageTransition = {
	type: 'fade',
	duration: 0.6,
	direction: 'left'
};

const VECTORS: Record<TransitionDirection, [number, number]> = {
	left: [-1, 0],
	right: [1, 0],
	up: [0, -1],
	down: [0, 1]
};

const OPPOSITE: Record<TransitionDirection, TransitionDirection> = {
	left: 'right',
	right: 'left',
	up: 'down',
	down: 'up'
};

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const WIPE_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

const pct = (n: number) => `${n * 100}%`;
const shift = ([x, y]: [number, number], k: number) => `translate(${pct(x * k)}, ${pct(y * k)})`;
const HOME = 'translate(0%, 0%)';

/** `inset()` that hides everything except the edge the new slide enters from. */
function edgeInset(dir: TransitionDirection, open: boolean) {
	// Travelling left means the content arrives from the right edge.
	const hidden = {
		left: 'inset(0% 0% 0% 100%)',
		right: 'inset(0% 100% 0% 0%)',
		up: 'inset(100% 0% 0% 0%)',
		down: 'inset(0% 0% 100% 0%)'
	}[dir];
	return open ? 'inset(0% 0% 0% 0%)' : hidden;
}

/**
 * Plays `t` with the Web Animations API. `incoming` sits above `outgoing`;
 * `veil` is an empty overlay used by the colour wipe. Going backwards
 * (`reverse`) flips the direction.
 */
export function playTransition(
	t: PageTransition,
	els: { incoming: HTMLElement; outgoing: HTMLElement; veil: HTMLElement },
	reverse = false
): Animation[] {
	const dir = reverse ? OPPOSITE[t.direction] : t.direction;
	const v = VECTORS[dir];
	const duration = t.duration * 1000;
	const opts = (easing: string): KeyframeAnimationOptions => ({ duration, easing });
	const { incoming, outgoing, veil } = els;

	switch (t.type) {
		case 'fade':
			return [incoming.animate([{ opacity: 0 }, { opacity: 1 }], opts('ease-in-out'))];

		case 'slide':
			return [
				incoming.animate([{ transform: shift(v, -1) }, { transform: HOME }], opts(EASE)),
				outgoing.animate([{ transform: HOME }, { transform: shift(v, 1) }], opts(EASE))
			];

		case 'circle':
			return [
				incoming.animate(
					[{ clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)' }],
					opts(WIPE_EASE)
				)
			];

		case 'linewipe':
			return [
				incoming.animate(
					[{ clipPath: edgeInset(dir, false) }, { clipPath: edgeInset(dir, true) }],
					opts(WIPE_EASE)
				)
			];

		case 'colorwipe':
			// A solid panel sweeps across, the new slide appears behind it, then it sweeps off.
			return [
				veil.animate(
					[
						{ clipPath: edgeInset(dir, false), opacity: 1 },
						{ clipPath: edgeInset(dir, true), opacity: 1, offset: 0.5 },
						{ clipPath: edgeInset(OPPOSITE[dir], false), opacity: 1 }
					],
					opts(WIPE_EASE)
				),
				incoming.animate(
					[
						{ opacity: 0 },
						{ opacity: 0, offset: 0.5 },
						{ opacity: 1, offset: 0.5 },
						{ opacity: 1 }
					],
					{ duration, easing: 'linear' }
				)
			];

		case 'flow':
			return [
				incoming.animate(
					[
						{ transform: shift(v, -1), filter: 'blur(14px)' },
						{ transform: HOME, filter: 'blur(0px)' }
					],
					opts(EASE)
				),
				outgoing.animate(
					[
						{ transform: HOME, opacity: 1 },
						{ transform: shift(v, 0.4), opacity: 0 }
					],
					opts(EASE)
				)
			];

		case 'stack':
			return [
				incoming.animate([{ transform: shift(v, -1) }, { transform: HOME }], opts(EASE)),
				outgoing.animate(
					[
						{ transform: 'scale(1)', filter: 'brightness(1)' },
						{ transform: 'scale(0.92)', filter: 'brightness(0.55)' }
					],
					opts(EASE)
				)
			];

		default:
			return [];
	}
}
