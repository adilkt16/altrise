# Alarm Sounds

This directory contains alarm sound files for the AltRise app.

## Sound Files

### Available Sounds
- `alarm_default.mp3` - Default alarm sound (classic beep pattern)
- `alarm_gentle.mp3` - Gentle wake-up sound (soft chimes)

### Sound Requirements
- Format: MP3 for best compatibility
- Duration: 3-10 seconds (will be looped)
- Quality: 44.1kHz, 128kbps minimum
- Volume: Normalized to prevent distortion

### Adding New Sounds
1. Place sound files in this directory
2. Update AudioService.ts sound map
3. Update user settings options
4. Test on both Android and iOS

## Audio Attribution
All sounds should be royalty-free or properly licensed.
Default sounds are generated for this application.
