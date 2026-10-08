# ClaveEight

Eight-bar clave pocket desk for bedroom producers and AI-music finishers.

Suno and loop DAWs put the kick, the bass, and the chord on the one. The vocal has nowhere to sit, and the loop never finishes because it has no rhythmic identity. Session players write a woodblock clave under that pocket: son 3-2, son 2-3, rumba, bossa, offbeat nylon chops, anticipations. The kick stays on the one so the bounce drops on bar 1 of a DAW.

Live samples only. FluidR3 acoustic kit, piano, nylon guitar, upright bass, and violin from the PreEight bank, plus FluidR3 woodblock. No oscillators. Audio never leaves the tab.

This desk is free.

## Distinct from yesterday and the rest of the line

| Tool | Job |
| --- | --- |
| TagFour | Four-bar last-line tag after the money chorus |
| ModEight | Last-chorus key change |
| LiftTwo | Two bars of climb into the hook |
| PreEight | Eight bars before the hook |
| AfterHook | Eight bars after the hook |
| EndEight | Last eight bars of the record |
| LastHook | Last chorus is the money chorus |
| AndEight | Kick owns the one, upright takes the and |
| ShakeFour | Shaker lift so the chorus feels bigger |
| **ClaveEight** | Eight bars of clave identity so a straight loop has a pocket |

Yesterday's form desks write a section. ClaveEight does not write a pre, a tag, a lift, or a key change. It seats a woodblock clave on the loop you already have.

## Pricing recommendation

One-time **$29** if you productize it, on Lemon Squeezy, mirrored on Gumroad. Do not subscribe. Forge Pass stays the subscription for the cloud tools (AuraMix, MixForge, ReleaseForge). Sell the desk where producers already buy one-shot utilities: Lemon Squeezy first, a Gumroad mirror, and a single post on r/WeAreTheMusicMakers. Not the App Store. Not Plugin Boutique.

The shipped app is free (MIT). No license gate.

## Samples

Pinned commit SHAs only.

- PreEight bank `@d58301e4a494555f411a2afbc448b724136eee76`
- FluidR3 woodblock `@044fab8e1456bfafc5776e86dfd6bb8697149aef`

Pinned commit SHAs only. Branch tips are not allowed.

## License

MIT. workinwithai-create.


## Export acceptance

Default bounce is 48 kHz, 24-bit stereo. At 92 BPM and 8 bars the loop file is exactly 1,001,739 samples (`Math.round(8 * 4 * 60 / 92 * 48000)`), first downbeat at sample 0. The offline render decodes the already-loaded ArrayBuffers into an OfflineAudioContext. It does not re-download. MIDI writes one track per chair with tempo and 4/4 set, and overlapping chord notes use absolute ticks so a DAW does not drop the stack.

Permanent URL: https://claveeight.vercel.app

This desk is free. No checkout. A priced build would need a Lemon Squeezy key check before it can be called a paid ship.
