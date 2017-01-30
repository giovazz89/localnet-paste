# localnet-paste Atom package

Paste your clipboard to other Atom localnet-paste users in your local network.


### Paste to local network

Hit ```Ctrl-Shift-V``` or go to ```Packages > Localnet Paste > Paste clipboard to network``` to show a list of users in your local network to paste your clipoard to

![Trigger localnet-paste command](https://cloud.githubusercontent.com/assets/1449608/21268117/ac158096-c3ad-11e6-8c7c-15b8c5caa0d2.png)

Select someone by clicking on the profile image or name, or use arrow/tab keys to navigate through listed users, and hit ```Enter``` to send your clipboard

![List of network users](https://cloud.githubusercontent.com/assets/1449608/21268215/fe7279c0-c3ad-11e6-8251-07b35c7b9d8a.png)

### Copy from local network

When someone sends you his clipboard you can accept (or decline) directly from the notification, and you are ready to paste around!

![Copy from network notification](https://cloud.githubusercontent.com/assets/1449608/21268236/174c2e78-c3ae-11e6-8c2e-f762fdac814e.png)

### Set your profile picture

Set what your network pals are going to see as your profile image by going to ```Packages > Localnet Paste > Set profile image```


### Set your nickname

Set your nickname going to Atom settings ( ```Ctrl-,``` ) and to ```Packages > localnet-paste``` ( the default value is your computer name )

![localnet-paste settings](https://cloud.githubusercontent.com/assets/1449608/21268187/e7217172-c3ad-11e6-9a22-e3b2e8628a36.png)

### How it works

On Atom startup it creates a Node.js server, listening for other users connections in the local network.
