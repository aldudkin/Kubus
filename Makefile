.PHONY: all deb win dmg clean

all:
	pnpm build && pnpm --filter @kubus/electron dist

deb:
	pnpm build && pnpm --filter @kubus/electron exec electron-builder --linux deb --x64

win:
	pnpm build && pnpm --filter @kubus/electron exec electron-builder --win --x64

dmg:
	pnpm build && pnpm --filter @kubus/electron exec electron-builder --mac dmg

clean:
	rm -rf electron/release
