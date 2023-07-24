![TM Switcher](https://user-images.githubusercontent.com/8839926/194345784-558c3ab7-8e0b-4d5d-a789-0ef14376bb56.png)

TM Switcher will automatically manage robotics competition livestreams that use VEX Tournament Manager. It has been used successfully at dozens of events, including the [Kalahari Classic Signature Event](https://www.youtube.com/watch?v=Z_GiBfU6cU8), [Northeast Wisconsin VRC Showdown](https://www.youtube.com/watch?v=p9lWt9ZrTQw), and numerous state championships across multiple seasons.

This application provides automation to simplify the workload of running a livestream for your event. See below for a list of features!

- Integrate with OBS to automatically change scenes when matches are queued or started

- Capable of controlling an ATEM switcher over the network when matches are queued or started

- Record timestamps for when each match starts and its timestamp in the livestream

- Create recordings for every match

- Support for events with multiple fieldsets and multiple divisions. This software assumes that *each* field set has its own livestream, so you will need to run an instance of the switcher for every livestream you wish to control.

<img width="1124" alt="image" src="https://github.com/MayorMonty/tm-obs-switcher/assets/8839926/217ed739-fefb-4aa6-b24f-ace06457a8c7">

## Install

Download the most recent build for your OS from [releases](https://github.com/MayorMonty/tm-obs-switcher/releases/), and run!  

## Run From Source

If you don't want to run from the precompiled executable, you can alternatively
run this program from the source code. This requires you to have the following
software installed:

- [Nodejs](https://nodejs.org) v14
- [Git](https://git-scm.com) (recommended)

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


## Troubleshooting

Some key implementation details to be aware of when deploying this at your event!

- Make sure your LAN allows connections between devices! We will deploy our own router attached to the upstream network for our events. This is strongly recommended if you use tablet scoring or multiple computers in your tournament. Additionally, make sure that connections at the following ports are allowed between devices on your network: `80`, `4455`

- ATEM control over USB is not supported due to a quirk in the control protocol. You will need to ensure that your switcher is connected to the network. Most ATEM switchers assign themselves static IPs (usually 192.168.10.240), so make sure that your router is able to assign that IP. Use the ATEM Setup utility over USB to connect 

If your event has trouble with this tool, please contact me!

## Disclaimer

This software is not officially supported by DWAB, VEX Robotics, or the REC Foundation. Event Partners utilizing TM Switcher are doing so at their own risk. This software is licensed under the MIT License, which permits commercial and non-commercial uses. The author disclaims all liability for running this software at your events.
