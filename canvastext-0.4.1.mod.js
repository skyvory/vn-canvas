﻿/**
 * Copyright (c) 2011 Pere Monfort Pàmies (http://www.pmphp.net)
 * Official site: http://www.canvastext.com
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 /* Modified by lo'ner for VN-Canvas
 12.22.14 - added "use strict" directive
 11.11.14 - added support for autotype
 01.07.12 - added support for scrolling
 01.06.12 - added support for text alignment
 12.03.11 - added support for \n in string
 12.04.11 - added classText to distinguish menu item
		  - added text coordinate return value to parent
 */
 "use strict";
 
function CanvasText() {
    // The property that will contain the ID attribute value.
    this.canvasId = null;
    // The property that will contain the Canvas element.
    this.canvas = null;
    // The property that will contain the canvas context.
    this.context = null;
    // The property that will contain the buffer/cache canvas.
    this.bufferCanvas = null;
    // The property that will contain the cacheCanvas context.
    this.bufferContext = null;
    // The property that will contain all cached canvas.
    this.cacheCanvas = [];
    // The property that will contain all cached contexts.
    this.cacheContext = [];
    // The property that will contain the created style class.
    this.savedClasses = [];

    /*
     * Default values.
     */
    this.fontFamily = "Verdana";
    this.fontWeight = "normal";
    this.fontSize = "12px";
    this.fontColor = "#000";
    this.fontStyle = "normal";
    this.textAlign = "start";
    this.textBaseline = "alphabetic";
    this.lineHeight = "16";
    this.textShadow = null;

    /**
     * Benckmark variables.
     */
    this.initTime = null;
    this.endTime = null;
	
	// MOD: Support for brute force scrolling
	this.scrollText = false;

    /**
     * Set the main values.
     * @param object config Text properties.
     */
    this.config = function (config) {
        var property;
        /*
         * A simple check. If config is not an object popup an alert.
         */
        if (typeof (config) !== "object") {
            alert("¡Invalid configuration!");
            return false;
        }
        /*
         * Loop the config properties.
         */
        for (property in config) {
            // If it's a valid property, save it.
            if (this[property] !== undefined) {
                this[property] = config[property];
            }
        }
    };

    /**
     * @param object textInfo Contains the Text string, axis X value and axis Y value.
     */
    this.drawText = function (textInfo) {
        this.initTime  = new Date().getTime();
        /*
         * If this.canvas doesn't exist we will try to set it.
         * This will be done the first execution time.
         */
        if (this.canvas == null) {
            if (!this.getCanvas()) {
                alert("Incorrect canvas ID!");
                return false;
            }
        }
        /**
         *
         */
        if (this.bufferCanvas == null) {
            this.getBufferCanvas();
        }
        /**
         * Get or set the cache if a cacheId exist.
         */
        if (textInfo.cacheId !== undefined) {
            // We add a prefix to avoid name conflicts.
            textInfo.cacheId = "ct" + textInfo.cacheId;
            // If cache exists: draw text and stop script execution.
            if (this.getCache(textInfo.cacheId)) {
                if (!textInfo.returnImage) {
                    this.context.drawImage(this.cacheCanvas[textInfo.cacheId], 0, 0);
                } else if (textInfo.returnImage) {
                    return this.cacheCanvas[textInfo.cacheId];
                }

                this.endTime = new Date().getTime();
                //console.log("cache",(this.endTime-this.initTime)/1000);
                return false;
            }
        }
        // A simple check.
        if (typeof (textInfo) != "object") {
            alert("Invalid text format!");
            return false;
        }
        // Another simple check
        if (!this.isNumber(textInfo.x) || !this.isNumber(textInfo.y)) {
            alert("You should specify a correct \"x\" & \"y\" axis value.");
            return false;
        }
		// MOD: added return value
		// MOD: support scroll
		// MOD: dynamically adjust bufferCanvas size
		var ret;
		if (!textInfo.scroll[0]) {
			this.scrollText = false;
	        // Reset our cacheCanvas.
	        this.bufferCanvas.width = this.bufferCanvas.width;
	        // Set the color.
	        this.bufferContext.fillStyle = this.fontColor;
	        // Set the size & font family.
	        this.bufferContext.font = this.fontWeight + ' ' + this.fontSize + ' ' + this.fontFamily;
	        // Parse and draw the styled text.
	        ret = this.drawStyledText(textInfo);
		}
		else {
			if (!this.scrollText) {
		        // Reset our cacheCanvas.
		        this.bufferCanvas.width = this.bufferCanvas.width;
		        // Set the color.
		        this.bufferContext.fillStyle = this.fontColor;
		        // Set the size & font family.
		        this.bufferContext.font = this.fontWeight + ' ' + this.fontSize + ' ' + this.fontFamily;
				// Parse and draw the styled text.
				ret = this.drawStyledText(textInfo);
				if (ret.linecount * this.lineHeight > this.bufferCanvas.height) 
					this.bufferCanvas.height = (ret.linecount+1) * this.lineHeight;
				else
					this.scrollText = true;
			}
		}
		// ENDMOD
        // Cache the result.
        if (textInfo.cacheId != undefined) {
            this.setCache(textInfo.cacheId);
        }
        
        this.endTime  = new Date().getTime();
        //console.log((this.endTime-this.initTime)/1000);
        // Draw or return the final image.
        if (!textInfo.returnImage) {
			// MOD: for scrolling
            this.context.drawImage(this.bufferCanvas, 0, Math.round(textInfo.scroll[1]));
        } else if (textInfo.returnImage) {
            return this.bufferCanvas;
        }
		// MOD return XY array
		return ret;
    };

    /**
     * The "painter". This will draw the styled text.
     */
    this.drawStyledText = function (textInfo) {
        // Save the textInfo into separated vars to work more comfortably.
        var text = textInfo.text, x = textInfo.x, y = textInfo.y;
        // Needed vars for automatic line break;
        var splittedText, xAux, textLines = [], boxWidth = textInfo.boxWidth;
        // Declaration of needed vars.
        var proFont = [], properties, property, propertyName, propertyValue, atribute;
        var classDefinition, proColor, proText, proShadow;
        // Loop vars
        var i, j, k, n;
		// MOD vars
		var endX, endY;
		var classText = false;
		var ret = {endpt:0, linecount:0, hotspot:[], length:0};

        // The main regex. Looks for <style>, <class> or <br /> tags.
        var match = text.match(/<\s*br\s*\/>|<\s*class=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/class\s*\>|<\s*style=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/style\s*\>|[^<]+/g);
        var innerMatch = null;

        // Let's draw something for each match found.
		var charcount = 0;
		var linecount = 0;
        for (i = 0; i < match.length; i++) {
            // Save the current context.
            this.bufferContext.save();
            // Default color
            proColor = this.fontColor;
            // Default font
            proFont.style = this.fontStyle;
            proFont.weight = this.fontWeight;
            proFont.size = this.fontSize;
            proFont.family = this.fontFamily;

            // Default shadow
            proShadow = this.textShadow;
			
			// MOD
			classText = false;

            // Check if current fragment is an style tag.
            if (/<\s*style=/i.test(match[i])) {
                // Looks the attributes and text inside the style tag.
                innerMatch = match[i].match(/<\s*style=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/style\s*\>/);
                    
                // innerMatch[1] contains the properties of the attribute.
                properties = innerMatch[1].split(";");

                // Apply styles for each property.
                for (j = 0; j < properties.length; j++) {
                    // Each property have a value. We split them.
                    property = properties[j].split(":");
                    // A simple check.
                    if (this.isEmpty(property[0]) || this.isEmpty(property[1])) {
                        // Wrong property name or value. We jump to the
                        // next loop.
                        continue;
                    }
                    // Again, save it into friendly-named variables to work comfortably.
                    propertyName = property[0];
                    propertyValue = property[1];

                    switch (propertyName) {
                    case "font":
                        proFont = propertyValue;
                        break;
                    case "font-family":
                        proFont.family = propertyValue;
                        break;
                    case "font-weight":
                        proFont.weight = propertyValue;
                        break;
                    case "font-size":
                        proFont.size = propertyValue;
                        break;
                    case "font-style":
                        proFont.style = propertyValue;
                        break;
                    case "text-shadow":
                        proShadow = this.trim(propertyValue);
                        proShadow = proShadow.split(" ");
                        if (proShadow.length != 4) {
                            proShadow = null;
                        }
                        break;
                    case "color":
                        if (this.isHex(propertyValue)) {
                            proColor = propertyValue;
                        }
                        break;
                    }
                }
                proText = innerMatch[2];
            
            } else if (/<\s*class=/i.test(match[i])) { // Check if current fragment is a class tag.
				// MOD
				classText = true;
                // Looks the attributes and text inside the class tag.
                innerMatch = match[i].match(/<\s*class=["|']([^"|']+)["|']\s*\>([^>]+)<\s*\/class\s*\>/);
               
                classDefinition = this.getClass(innerMatch[1]);
                /*
                 * Loop the class properties.
                 */
                for (atribute in classDefinition) {
                    switch (atribute) {
                    case "font":
                        proFont = classDefinition[atribute];
                        break;
                    case "fontFamily":
                        proFont.family = classDefinition[atribute];
                        break;
                    case "fontWeight":
                        proFont.weight = classDefinition[atribute];
                        break;
                    case "fontSize":
                        proFont.size = classDefinition[atribute];
                        break;
                    case "fontStyle":
                        proFont.style = classDefinition[atribute];
                        break;
                    case "fontColor":
                        if (this.isHex(classDefinition[atribute])) {
                            proColor = classDefinition[atribute];
                        }
                        break;
                    case "textShadow":
                        proShadow = this.trim(classDefinition[atribute]);
                        proShadow = proShadow.split(" ");
                        if (proShadow.length != 4) {
                            proShadow = null;
                        }
                        break;
                    }
                }
                proText = innerMatch[2];
            } else if (/<\s*br\s*\/>/i.test(match[i])) {
                // Check if current fragment is a line break.
                y += parseInt(this.lineHeight, 10) * 1.0;
                x = textInfo.x;
				linecount++;
                continue;
            } else {
                // Text without special style.
                proText = match[i];
            }

            // Set the text Baseline
            this.bufferContext.textBaseline = this.textBaseline;
            // Set the text align
            this.bufferContext.textAlign = this.textAlign;
            // Font styles.
            if (proFont instanceof Array) {
                this.bufferContext.font = proFont.style + " " + proFont.weight + " " + proFont.size + " " + proFont.family;
            } else {
                this.bufferContext.font = proFont;
            }
            this.bufferContext.font = proFont;
            // Set the color.
            this.bufferContext.fillStyle = proColor;
            // Set the Shadow.
            if (proShadow != null) {
                this.bufferContext.shadowOffsetX = proShadow[0].replace("px", "");
                this.bufferContext.shadowOffsetY = proShadow[1].replace("px", "");
                this.bufferContext.shadowBlur = proShadow[2].replace("px", "");
                this.bufferContext.shadowColor = proShadow[3].replace("px", "");
            }
            
            // Reset textLines;
            textLines = [];
            // Clear javascript code line breaks.
			// MOD: by lo'ner, change \n as new word
			// proText = proText.replace(/\s*\n\s*/g, " ");
			proText = proText.replace(/\s*\n\s*/g, " \n ");
			// ENDMOD

            // Automatic Line break
            if (boxWidth !== undefined) {

                // If returns true, it means we need a line break.
                if (this.checkLineBreak(proText, (boxWidth+textInfo.x), x)) {
                    // Split text by words.
                    splittedText = this.trim(proText).split(" ");

                    // If there's only one word we don't need to make more checks.
                    if (splittedText.length == 1) {
                        textLines.push({text: this.trim(proText) + " ", linebreak: true});
                    } else {
                        // Reset vars.
                        xAux = x;
                        var line = 0;
                        textLines[line] = {text: undefined, linebreak: false};

                        // Loop words.
                        for (k = 0; k < splittedText.length; k++) {
                            splittedText[k] += " ";
                            // Check if the current text fits into the current line.
                            if (!this.checkLineBreak(splittedText[k], (boxWidth+textInfo.x), xAux)) {
                                // Current text fit into the current line. So we save it
                                // to the current textLine.
                                if (textLines[line].text == undefined) {
                                    textLines[line].text = splittedText[k];
                                } else {
                                    textLines[line].text += splittedText[k];
                                }
                                
                                xAux += this.bufferContext.measureText(splittedText[k]).width;
                            } else {
                                // Current text doesn't fit into the current line.
                                // We are doing a line break, so we reset xAux
                                // to initial x value.
                                xAux = textInfo.x;
                                if (textLines[line].text !== undefined) {
                                    line++;
                                }
								
								// MOD: by lo'ner, check for newline, added 3 lines
								if (splittedText[k].search('\n')!=-1)
									textLines[line] = {text: undefined, linebreak:true};
								else
								// ORIG:
									textLines[line] = {text: splittedText[k], linebreak: true};
								// ENDMOD
                                xAux += this.bufferContext.measureText(splittedText[k]).width;
                            }
                        }
                    }
                }
            }

            // if textLines.length == 0 it means we doesn't need a linebreak.
            if (textLines.length == 0) {
                textLines.push({text: this.trim(proText) + " ", linebreak: false});
            }

			// MOD: add support for autotype
            // Let's draw the text
			//linecount += textLines.length;
            for (n = 0; n < textLines.length; n++) {
                // Start a new line.
                if (textLines[n].linebreak) {
                    y += parseInt(this.lineHeight, 10);
                    x = textInfo.x;
					linecount++;
                }
				// MOD: do not autotype when scrolling
				if (classText)
					ret.hotspot.push([x, y]);
				this.bufferContext.globalAlpha = textInfo.alpha;
				if (textInfo.align == 'center') {
					this.bufferContext.textAlign = 'center';
					if ((!textInfo.scroll[0]) && (textInfo.autotype[0]))
						this.bufferContext.fillText(textLines[n].text.substr(0,textInfo.autotype[1]-charcount), x+textInfo.boxWidth/2, y);
					else
						this.bufferContext.fillText(textLines[n].text, x+textInfo.boxWidth/2, y);
				}
				else if ((textInfo.align == 'right') || (textInfo.align == 'end')) {
					this.bufferContext.textAlign = 'end';
					if ((!textInfo.scroll[0]) && (textInfo.autotype[0]))
						this.bufferContext.fillText(textLines[n].text.substr(0,textInfo.autotype[1]-charcount), x+textInfo.boxWidth, y);
					else
						this.bufferContext.fillText(textLines[n].text, x+textInfo.boxWidth, y);
				}
				else {
					this.bufferContext.textAlign = 'start';
					if ((!textInfo.scroll[0]) && (textInfo.autotype[0]))
						this.bufferContext.fillText(textLines[n].text.substr(0,textInfo.autotype[1]-charcount), x, y);
					else
						this.bufferContext.fillText(textLines[n].text, x, y);
				}
                // Increment X position based on current text measure.
                x += this.bufferContext.measureText(textLines[n].text).width;
				// MOD: added endX and endY
				if (textInfo.align == 'center')
					endX = (x + textInfo.boxWidth)/2;
				else if ((textInfo.align == 'right') || (textInfo.align == 'end'))
					endX = textInfo.boxWidth - x;
				else
					endX = x;
				endY = y;

				charcount += textLines[n].text.length;
            }

            this.bufferContext.restore();
        }
		ret.endpt = [endX, endY];
		ret.linecount = linecount;
		ret.length = charcount;
		return ret;
    };

    /**
     * Save a new class definition.
     */
    this.defineClass = function (id, definition) {
        // A simple check.
        if (typeof (definition) != "object") {
            alert("¡Invalid class!");
            return false;
        }
        // Another simple check.
        if (this.isEmpty(id)) {
            alert("You must specify a Class Name.");
            return false;
        }

        // Save it.
        this.savedClasses[id] = definition;
        return true;
    };

    /**
     * Returns a saved class.
     */
    this.getClass = function (id) {
        if (this.savedClasses[id] !== undefined) {
            return this.savedClasses[id];
        }
    };
    
    this.getCanvas = function () {
        // We need a valid ID
        if (this.canvasId == null) {
            alert("You must specify the canvas ID!");
            return false;
        }
        // Let's save the Canvas into our class property...
        this.canvas  = document.getElementById(this.canvasId);
        // ... and save its context too.
        this.context = this.canvas.getContext('2d');
        this.getBufferCanvas();

        return true;
    };

    this.getBufferCanvas = function () {
        // We will draw the text into the cache canvas
        this.bufferCanvas = document.createElement('canvas');
        this.bufferCanvas.width = this.canvas.width;
        this.bufferCanvas.height = this.canvas.height;
        this.bufferContext = this.bufferCanvas.getContext('2d');
    };
	
	// MOD
	this.updateCanvas = function (c) {
		if (this.canvas != null) {
			this.canvas.width = this.canvas.width;
			this.canvas.height = this.canvas.height;
		}
		if (this.bufferCanvas != null) {
			this.bufferCanvas.width = this.canvas.width;
			this.bufferCanvas.height = this.canvas.height;
		}
	};
	
    /**
     * Check if the cache canvas exist.
     */
    this.getCache = function (id) {
        if (this.cacheCanvas[id] === undefined) {
            return false;
        } else {
            return true;
        }
    };
    /**
     * We create a new canvas element for each cache element.
     */
    this.setCache = function (id) {
        this.cacheCanvas[id] = document.createElement("canvas");
        this.cacheCanvas[id].width = this.bufferCanvas.width;
        this.cacheCanvas[id].height = this.bufferCanvas.height;
        this.cacheContext[id] = this.cacheCanvas[id].getContext('2d');
        this.cacheContext[id].drawImage(this.bufferCanvas, 0, 0);
    };
    /**
     * Check if a line break is needed.
     */
    this.checkLineBreak = function (text, boxWidth, x) {
		// MOD: by lo'ner, added check for newline
        //return (this.bufferContext.measureText(text).width + x > boxWidth);
        return ((this.bufferContext.measureText(text).width + x > boxWidth) || (text.search('\n')!=-1));
		// ENDMOD
    };

    /**
     * A simple function to validate a Hex code.
     */
    this.isHex = function (hex) {
        return (/^(#[a-fA-F0-9]{3,6})$/i.test(hex));
    };
    /**
     * A simple function to check if the given value is a number.
     */
    this.isNumber = function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    /**
     * A simple function to check if the given value is empty.
     */
    this.isEmpty = function (str) {
        // Remove white spaces.
        str = str.replace(/^\s+|\s+$/, '');
        return str.length == 0;
    };
    /**
     * A simple function clear whitespaces.
     */
    this.trim = function (str) {
        var ws, i;
        str = str.replace(/^\s\s*/, '');
        ws = /\s/;
        i = str.length;
        while (ws.test(str.charAt(--i))) {
            continue;
        }
        return str.slice(0, i + 1);
    };
}