## NEC Projector

Control and monitor an NEC projector from Companion over your network — no extra hardware
or cables needed, just the projector's IP address.

This works with NEC projectors (the **"NP" series**, including models now branded
**Sharp NEC**) that have a network connection and the built-in web control page. It does
**not** control Sharp's own (non-NEC) projectors — those use a different system.

### Set up

1. Connect the projector to the same network as your Companion computer, and find its IP
   address (shown in the projector's network menu).
2. Add this connection and type in the **IP address**. Leave the **port** at `80`.
3. If the projector's web page asks for a password, enter the **user name** and
   **password**. If it doesn't, leave them blank.
4. That's it — buttons and status start working right away.

### Turning the projector on over the network

Some projectors ignore a network "power on" while in deep standby. If power-on doesn't
work, set the projector's **Standby Mode** to **Network Standby** (or **Normal**) in its
own menu.

### Choosing an input

Just pick the input by name (HDMI 1, Computer 1, Video…). The module automatically works
out the exact code your projector uses and remembers it. Only if you have an unusual model
and an input won't switch, pick **Custom** and enter the code from your projector's manual.

> Tip: "Computer 1/2/3" are the analog **VGA** (15-pin) inputs.

### Lamp life

- **Lamp life remaining** = how much lamp life is **left** (100% = new, 0% = replace soon).
- **Lamp hours used** = how many hours the lamp has run.

Both are available as ready-made status buttons and as variables.

### Buttons, colours and status

Ready-made buttons are on the **Presets** tab — Power, Inputs, Mute / Freeze, Volume and
Status. The power buttons change colour with the projector:

- **Green** = on
- **Orange** = warming up
- **Blue** = cooling down
- **Red** = off

Status buttons show live information (active input, lamp life, lamp hours, filter hours,
eco mode, errors and more).

### If something isn't working

- **"Connection failure"** — double-check the IP address and that the projector is on the
  network. Try opening `http://<projector-ip>/` in a web browser.
- **A button does nothing** — some commands only work while the projector is on, and a few
  features (lens, shutter, edge blending) only exist on certain models and are safely
  ignored on others.
