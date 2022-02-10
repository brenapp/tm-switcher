# Tournament Manager OBS Switcher

This is small tool to automatically switch scenes in OBS when VEX Tournament
Manager queues up a new match on a fieldset.

![image](https://user-images.githubusercontent.com/8839926/153454145-18752edc-5022-4fa5-a0eb-538dfd4a5a1e.png)

## Requirements

- [OBS WebSocket
  Plugin](https://obsproject.com/forum/resources/obs-websocket-remote-control-obs-studio-from-websockets.466/).
  Required to programmatically control OBS

## Install

1. Install the WebSocket plugin in OBS
2. Head over to the
   [releases](https://github.com/MayorMonty/tm-obs-switcher/releases) page and
   download the latest version for your platform. Alternatively, you can clone
   the repository and run the code from source.
3. Unzip the executable, and run!

## Run From Source

If you don't want to run from the precompiled executable, you can alternatively
run this program from the source code. This requires you have the following
software installed:

- [Nodejs](https://nodejs.org) v14
- [Git](https://git-scm.com) (reccomended)

1. Clone or download this repository
2. In a terminal window inside the cloned source, run the following commands:

```
npm install
npm run-script build
```

3. To run the program, enter the command:

```
npm run-script run
```
