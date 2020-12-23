# Jigsaw Puzzle Tracker
This is a quick program to track progress while putting together a jigsaw puzzle,
while and sharing piece count and rate (with nifty chart!) when livestreaming with OBS.

It uses ExpressJS and Google Charts library (which in turn uses Chromium and Puppeteer to generate charts). It's only been tested on Windows.  Feel free to contribute improvements!
# Getting Started
## Installing
- [Install Node and npm](https://www.npmjs.com/get-npm)
- In a command prompt, create a directory to hold the application and change into it. We'll reference this as `<APPDIR>` in these instructions.
    - `mkdir c:\puzzle`
    - `cd c:\puzzle`
- `npm install jigsaw-puzzle-tracker` to install this app

## Running
- `npx jigsaw-puzzle-tracker` to start the local server (or `npx jpt` for less typing!)
- Point your web browser to the URL shown on startup (For example, http://192.168.0.10:3333/ - but use the IP address of the PC you are running this on).
- Recommend to open the page on a mobile device to keep it within easy reach of your puzzle!

## Configuration
The first time you run the server, a file called config.json will be created in your local directory.  

To make configuration changes, stop the server, edit the file, and restart the server.  If you get an error on restart, the configuration file may have a syntax error. If you can't spot the errro, you can delete config.json and start over.

### Options
- **chartBackgroundColor** - Chart background color. Default is `'Black'`
- **chartGridColor** - Chart grid color. Default is `'DimGray'`
- **chartLineColor** - Chart line color. Default is `'PowderBlue'`
- **chartTextColor** - Chart axis text color. Default is `'White'`
- **chartHeight** - Chart height in pixels. Default is `120`
- **chartWidth** - Chart width in pixels. Default is `320`
- **chartUpdateFrequency** - Seconds between updating the trend chart. Default is `30`
- **movingAverageMinutes** - Timespan to use when calculating the piece placement rate. Default is `15`
- **httpPort** - Server listening port. Default is `3333`
- **displayTemplate** - Template to use for display text.  Use `\r\n` for a newline.  The following placeholders are recognized:
    - `_COUNT_` will be replaced by the current piece count.
    - `_RATE_` will be replaced by the current rate.
     Default is: `"Pieces placed: _COUNT_\r\n  Pieces/hour: _RATE_\r\n"`

## Using OBS or SLOBS (optional)
- Add a Text Source pointing to the file `<APPDIR>/data/display.txt`.  Set the color and font as you wish.
- Add an Image Source pointing to the file `<APPDIR>/data/chart.png`

NOTE: Sometimes when restarting OBS, the Image Source will update to point to a cached file.  If your chart is not updating, verify the file source is still correct.

## Tracking your puzzle progress

Recommended method:
- Each time you connect a single free piece to another, add 1 piece to the count 
- Each time you connect two free pieces to each other, add 2 pieces to the count
- When connecting multiple pieces to multiple pieces, DO NOT increment the count 

## Resetting for a different puzzle
- Stop the App
- Delete or rename the "data" directory.  An empty data directory will be created for the next puzzle.


