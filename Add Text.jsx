/**
 * - Page match regular expression simplification for CS5 compatibility.
 * - Event listeners on delimeter text inputs direct set by attribute for 
 *   CS5 compatibility.
 * - List fonts with PostScript name so we can set the font property of text
 *   types easily.
 * - Verify config file exists when selecting.
 *
 * 20090911
 * - File and folder inputs editable
 * - Better handling for match input with no end text
 * - Fix for error if config select cancelled
 * - Fix for default ignore regex not matching properly
 * - Page match now ignores : and > after the numbers
 *
 * 20090129
 * - Handles multiple text types on the same line.
 *
 * 20090124
 * - Implemented import/export of settings (doesn't work with weird labels)
 * - Updated to work with CS4
 * - Units are now restored when toggling between text types
 * - Trans test file will be auto-opened after being created
 * - Added input for page number match
 *
 * 20080730
 * - Fix for bug in global ignore
 *
 * 20080727
 * - Default global ignore to being set
 * - Added color hex value input
 *
 * 20080726
 * - Added page match for <##>
 * - Fixed selection of "metrics" kerning
 *
 * This script is used to add text from a translation onto the separate pages
 * in a manga.
 *
 **
 * todo
 * - area for info messages
 * - option to save to output directory
 * - implement embedded text types
 * - speed up the adding text to page
 * - trans location guessing
 * - text type defaults
 * - option to remove existing text
 * - remember locations of opened files
 **
 * written by kepp
 **/

$.strict = true;

var UND = undefined; // because I don't feel like typing the whole thing out

// need to make sure regex are parsed properly when loaded from saved file

/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/

/**
 * Helper used to parse the trans file into a more useable format
 **/
function Trans()
{
}

Trans.prototype.init = function( file, types, pageMatch, ignore )
{
  this.file = file;
  this.setRegExp( types );
  this.pageRE = new RegExp( pageMatch, "i" );
  this.ignoreRE = new RegExp( ignore );
  this.pageText = this.parseText();
}


/**
 * RegExp to match against page number lines and extract the page number
 * String tests ( match will always be case insensitive ):
 *   page 1
 *   page. 2
 *   pages 3-4
 *   pages. 5-6
 *   p 7
 *   p. 8
 *   pp 9-10
 *   pp. 11-12
 *   pg 13
 *   pg. 13
 *   pgs 14-15
 *   pgs. 16-17
 *   this page 9 sucks
 *
 **/
 
/**
 * Regular expression to match against page numbers
 * I've found photoshop can die on this if trying to test against <text> if
 * p{1,2} is used
 **/
Trans.prototype.pageRE =
  /^\s*(?:(?:p|pp|page|pg)?[.s]{0,2}|<)\s*([\d-]{1,9})[>:]?(.*)/

/**
 * RegExp to filter out parts of the line
 **/
Trans.prototype.ignoreRE = /^[\w()?\-'&\s]+?[:>]\s*|^\s+/;

Trans.prototype.hasContentRE = /.*[\w!?.]+.*/;
Trans.prototype.regex = {};
Trans.prototype.file = null;
Trans.prototype.pageText = null;


/**
 * Initializes the regexps used to grab the different text blocks
 **/
Trans.prototype.setRegExp = function( types )
{
  var all = "", nodelim;
  this.regex = {};

  for ( var type in types )
  {
    var typeObj = types[ type ];
    this.regex[ typeObj.label ] = {};

    this.regex[ typeObj.label ].test = new RegExp( typeObj.regexp );
    if ( typeObj.replaceChk )
      this.regex[ typeObj.label ].replace =
      {
        match: new RegExp( typeObj.match ),
        replace: typeObj.replace
      };
  }
};


/**
 * Function used to parse the trans text file into an array and determine the
 * type of text block
 **/
Trans.prototype.parseText = function()
{
  var trans = new Object(), line = "", page = null;

  if ( !this.file.open( "r" ))
  {
    alert( "Couldn't open trans file" );
    return;
  }

  while ( ( line = this.getNextLine( this.file ) ) )
  {
    if ( this.pageRE.test( line ) )
    {
      page = new Array();
      trans[ RegExp.$1 ] = page;

      // if there's text on the same line as the page number, save it
      if ( RegExp.$2 )
        this.parseLine( RegExp.$2, page )
    }
    else if ( page )
    {
      this.parseLine( line, page )
    }
  }

  var closed = this.file.close();
  if ( !closed )
    alert( "trans file close error" );

  return trans;
};


/**
 * Determine the type of line currently being parsed
 **/
Trans.prototype.parseLine = function( line, page )
{
  var clean = line.replace( this.ignoreRE, "" );
  if ( !clean )
    return;

  // look for the first match and add it to the page
  for ( var re in this.regex )
  {
    var regex = this.regex[ re ];

    if ( regex.test.test( clean ) )
    {
      var extract = RegExp.$1;
      var follow = RegExp.$2.replace( this.ignoreRE, "" );

      if ( regex.replace )
        extract = extract.replace( regex.replace.match,
                                   regex.replace.replace );

      page.push( { "orig": line, "type": re, "text": extract } );

      // process following text
      if ( follow /*&& follow != clean && this.hasContentRE.test( follow )*/ )
        this.parseLine( follow, page );

      return;
    }
  }
};


/**
 * Get the next non-empty line in the trans file
 **/
Trans.prototype.getNextLine = function( file )
{
  var line = "";

  // keep going until there's a line or it's the end of the file
  while ( !line && !file.eof )
  {
    line = file.readln();
    line = line.replace( /^\s+/, "" );
    line = line.replace( /\s+$/, "" );
  }

  return line;
};


/**
 * Get the array text lines for the page
 **/
Trans.prototype.getPages = function()
{
  return this.pageText;
};


/**
 * Get the text representation of the trans
 **/
Trans.prototype.getText = function()
{
  var trans = this.pageText;
  var text = "";

  for ( var number in trans )
  {
    var page = trans[number];
    text += "\nPage " + number + ":\n";

    for ( var i = 0, line; line = page[i]; i++ )
      text += line.type + ": " + line.text + " [" + line.orig + "]\n";
  }

  return text;
};



/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/



/**
 * Helper object to create text types
 **/
function TypeHolder( inputs, textTypes )
{
  this.checkLabel( inputs.label, textTypes );
  this.checkSize( inputs.size );

  var type = {};
  for ( var name in inputs )
  {
    var ctrl = inputs[ name ];
    type[ name ] = ( ctrl.type == "edittext" ) ? ctrl.text : 
		             ( ctrl.selection ? ctrl.selection.text : ctrl.value );
  }

  return type;
}

/**
 * Check that the label for the text type being added is valid
 **/
TypeHolder.prototype.checkLabel = function( input, textTypes )
{
  var label = input.text.replace( /[\W]/g, "_" );

  if ( !label )
  {
    label = "_1";
  }

  while ( textTypes[ label ] )
  {
    /(.*?)(_?)([\d]*)$/.test( label );
    label = RegExp.$1 + ( (RegExp.$2 ) ?
            RegExp.$2 + ( Number( RegExp.$3 ) + 1 ) : "_1" );
  }

  input.text = label;
};

/**
 * Validate the inputted text size
 **/
TypeHolder.prototype.checkSize = function( size )
{
  if ( size.text && !/^\d+$/.test( size.text ))
  {
    size.text = prompt( "Text size invalid. Set new value:", 12 );
    this.checkSize( size );
  }
};





/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/



/**
 * Show the script configuration dialog
 **/
function UserInterface()
{
  var res =
    "dialog { text: 'Add Text Dialog', margins: 5, \
      selectGrp: Group {}, \
      textPnl: Panel { \
        text: 'Text Types', orientation: 'column', alignChildren: 'fill', \
        pageMatchGrp: Group { orientation: 'column', alignChildren: 'fill' }, \
        ignoreGrp: Group { orientation: 'column', alignChildren: 'fill' }, \
        textGrp: Group { alignChildren: 'top', \
          listGrp: Group { orientation: 'column' }, \
          inputGrp: Group { alignChildren: 'fill', orientation: 'column', \
            grp1: { orientation: 'column', alignChildren: 'fill' } \
          } \
        } \
      }, \
      buttonGrp: Group { orientation: 'row' } \
    }";

  var dlg = new Window( res );
  dlg.center();

  this.trans = new Trans();

  this.addControls( dlg );

  this.dialog = dlg;
  dlg.show();
}


UserInterface.prototype.dialog = null;
UserInterface.prototype.transFile = null;
UserInterface.prototype.imgDir = null;
UserInterface.prototype.typeList = null;
UserInterface.prototype.textTypes = {};
UserInterface.prototype.inputs =
{
  label: null,
  delimRb: null,
  start: null,
  end: null,
  regexRb: null,
  regexp: null,
  replaceChk: null,
  match: null,
  replace: null,
  font: null,
  size: null,
  units: null,
  color: null,
  kern: null
};
UserInterface.prototype.trans = null;
UserInterface.prototype.ignore = null;
UserInterface.prototype.pageMatch = null;


UserInterface.prototype.bind = function( func )
{
  var ui = this;
  var args = Array.prototype.slice.call( arguments, 1 );
  var b = function()
  {
    var allArgs = args.concat( Array.prototype.slice.call( arguments ) );
    return func.apply( ui, allArgs );
  };
  return b;
};


/*****************************************************************************/


/**
 * Helper to construct resource strings
 **/
UserInterface.prototype.getRes = function( props )
{
  return ( ( props.grp ) ? props.grp + ": Group" : "group" ) + "{" +
    ( ( props.lbl ) ? "st: StaticText { text:'" + props.lbl + 
      "' }," : "" ) +
    "el:" + ( props.type || "EditText" ) +
      " { name: '" + ( props.name || "" ) + 
      "', size: [" + ( props.width || 100 ) + ",20]," + 
      "text:'" + ( props.text || "" ) + "'}}";
};


/**
 * Fill out the dialog with controls for user input
 **/
UserInterface.prototype.addControls = function( dlg )
{
  this.addSelects( dlg.selectGrp );              // file + directory selection
  this.addIgnoreInput( dlg.textPnl.ignoreGrp );  // trans text ignore input
  this.addPageMatch( dlg.textPnl.pageMatchGrp ); // match against page numbers
  this.addTypeInput( dlg.textPnl.textGrp );      // inputs for text types

  this.addActionButtons( dlg, dlg.buttonGrp );   // type and dialog management
};


/*****************************************************************************/


/**
 * Add UI elements to select the translation file and raw image directory
 **/
UserInterface.prototype.addSelects = function( selectGrp )
{
  selectGrp.orientation = "column";

  var addUI = this.bind( function( text, handler, start )
  {
    var select = selectGrp.add( "group", UND );

    var path = select.add( "edittext", UND, text );
    path.size = [ 300, 20 ];
    path.addEventListener( "focus", function() {
                                      if ( !this.text || this.text == text )
                                      {
                                        this.oldPath = path.text;
                                        this.text = "";
                                      }
                                    }, false );
    path.addEventListener( "blur", function() {
                                      if ( !this.text || this.text == text )
                                        this.text = this.oldPath || "";
                                    }, false );

    var btn = select.add( "button", UND, "Browse..." );
    btn.addEventListener( "click", this.bind( handler, path, start ), false );
  } );

  var file, folder;
  if ( app.documents.length )
  {
    file = activeDocument.fullName;
    folder = activeDocument.fullName.parent;
  }
  else
  {
    folder = Folder.myDocuments;
  }

  addUI( "Select Translation...", this.selectTrans, ( file || new File() ) );
  addUI( "Select Image Directory...", this.selectFolder, folder );
};


/**
 * Add fields for the trans text to match the text type against
 **/
UserInterface.prototype.ignoreChkValue = true;
UserInterface.prototype.addIgnoreInput = function( ignoreGrp )
{
  var grp = ignoreGrp.add( 
    "group { \
      chk: Checkbox { text: 'Global Ignore:' }," +
      this.getRes( { name: "ignore", width: 200, grp: "grp1" } ) +
    "}" );
  this.ignore = grp.grp1.el;

  grp.chk.addEventListener( "click", this.bind( this.toggleIgnore ), false );

  grp.chk.value = true;
  var s = this.trans.ignoreRE.toString();
  grp.grp1.el.text = s.substring( 1, s.length - 1 );

  ignoreGrp.add( "panel {}" ); // horizontal divider
};

UserInterface.prototype.toggleIgnore = function( event )
{
  var value = !this.ignoreChkValue;
  var el = this.ignore;

  el.parent.enabled = value;
  el.enabled = value;

  var def = "text to ignore";;
  if ( el.text == def )
  {
    var s = this.trans.ignoreRE.toString();
    el.text = s.substring( 1, s.length - 1 );
  } 
  else if ( !el.text )
  {
    el.text = def;
  }

  this.ignoreChkValue = value;
};

UserInterface.prototype.addPageMatch = function( pageMatchGrp )
{
  var grp = pageMatchGrp.add( 
    "group {" +
      this.getRes( { name: "pagematch", lbl: 'Page # Match:',
                     width: 350, grp: "grp1" } ) +
    "}" );

  var el = this.pageMatch = grp.grp1.el;
  var s = this.trans.pageRE.toString();
  el.text = s.substring( 1, s.length - 1 );
};


/**
 * Add elements to the dialog needed for creating new text types and viewing
 * already created text types
 **/
UserInterface.prototype.addTypeInput = function( textGrp )
{
  this.addTypeList( textGrp.listGrp );
  this.addConfigButtons( textGrp.listGrp );

  var res = this.getRes( { type: "EditText", lbl: "Label:", name: "label" } );
  var label = textGrp.inputGrp.add( res ).el;
  this.inputs.label = label;

  this.addMatchInput( textGrp.inputGrp );
  this.addReplaceInput( textGrp.inputGrp );
  this.addFontInput( textGrp.inputGrp );

  this.addInputButtons( textGrp.inputGrp );
};


/**
 * Add buttons to start and cancel processing
 **/
UserInterface.prototype.addActionButtons = function( dlg, parent )
{
  var group = parent.add( "group" );
  group.alignment = "left";

  dlg.testButton = group.add( "button", UND, "Test Trans" );
  dlg.testButton.enabled = false;
  dlg.testButton.addEventListener( "click", this.bind( this.testTrans ), 
                                   false );
  var act = group.add( "group" );
  act.position = "left";

  dlg.defaultElement = act.add( "button", UND, "Go" );
  dlg.defaultElement.enabled = false;

  dlg.defaultElement.addEventListener( "click", this.bind( function( event )
  {
    this.trans.init( this.transFile, this.textTypes,
                     this.pageMatch.text, this.ignore.text );
    new Processor( this.imgDir, this.trans, this.textTypes ); // it auto starts

    this.dialog = this.typeList = this.textTypes = null;
    this.inputs = this.ignore = null;
  } ), false );

  dlg.cancelElement = act.add( "button", UND, "Cancel" );
};



/*****************************************************************************/


/**
 * Test parse the trans and output the results
 **/
UserInterface.prototype.testTrans = function()
{
    this.trans.init( this.transFile, this.textTypes,
                     this.pageMatch.text, this.ignore.text );
    var trans = this.trans.getText();
    var file = new File( this.transFile.path + "/test.txt" );
    var test = file.saveDlg( "Save Test File" );

    if ( !test )
    {
      return;
    }

    try {
      test.open( "w" );
      test.write( trans );
      test.close( trans )
      test.execute();
    }
    catch ( e )
    {
      alert( "Error writing test file: "  + e );
    }
};


/**
 * Add a panel to the dialog to show the current text types
 **/
UserInterface.prototype.addTypeList = function( listGrp )
{
  var typeList = listGrp.add( "listbox", UND );
  typeList.size = [ 100, 200 ];

  // assign onChange event handler directory, addEventListener doesn't seem to
  // work with CS5
  typeList.onChange = this.bind( function()
  {
    if ( typeList.selection ) // no selection if clicking in empty area
    {
      var values = this.textTypes[ typeList.selection.text ];

      for ( var n in this.inputs )
        this.restoreInput( this.inputs, values, n );
    }
  } );

  this.typeList = typeList;
};


/**
 * Restore input to a saved value
 **/
UserInterface.prototype.restoreInput = function( inputs, values, name )
{
  var input = inputs[ name ];

  switch ( name )
  {
    case "font":
    case "kern":
    case "units":
      for ( var i = 0, item; item = input.items[ i ]; i++ )
        if ( item.text == values[name] )
        {
          input.selection = i;
          break;
        }
      break;
    case "delimRb":
      this.toggleMatch( values[ name ] );
    case "regexRb": // only one radio button is stored/needed
      break;
    case "replaceChk":
      this.toggleReplace( values[ name ] );
    case "color":
      input.value = values[ name ];
      break;
    default:
      input.text = ( values[ name ] || "" );
  }
};


/**
 * Add buttons for saving and loading config files
 **/
UserInterface.prototype.addConfigButtons = function( parent )
{
  var group = parent.add( "group { orientation: 'column' }" );
  group.add( "button", UND, "Load..." ).
    addEventListener( "click", this.bind( this.loadConfig ), false );
  group.add( "button", UND, "Save As..." ).
    addEventListener( "click", this.bind( this.saveConfig ), false );;
};


/**
 * Add fields for the trans text to match the text type against
 **/
UserInterface.prototype.addMatchInput = function( inputGrp )
{
  var pnl = inputGrp.add( 
    "panel { text: 'Match', orientation: 'column', \
                      alignChildren: 'left', \
      grpLR: Group { \
        grpL: Group { orientation: 'column', \
          rb1: RadioButton {}, \
          rb2: RadioButton {} \
        }, \
        grpR: Group { orientation: 'column', \
          grp1: Group {" +
            this.getRes( { lbl: "Start:", name: "start", grp: "grp1a" }) +
              "," +
            this.getRes( { lbl: "End:", name: "end", grp: "grp1b" } ) +
          "}, \
          grp2: Group {" +
            this.getRes( { lbl: "RegExp:", name: "regexp", width: 200,
                           grp: "grp", text: "(.*)" } ) + 
          "}, \
        } \
      } \
    }" );

  this.initMatchInput( pnl );
};

UserInterface.prototype.initMatchInput = function( pnl )
{
  var grpR = pnl.grpLR.grpR, grpL = pnl.grpLR.grpL;

  this.inputs.delimRb = grpL.rb1;
  this.inputs.regexRb = grpL.rb2;

  var start = this.inputs.start = grpR.grp1.grp1a.el;
  var end = this.inputs.end = grpR.grp1.grp1b.el;
  this.inputs.regexp = grpR.grp2.grp.el;

  start.onChanging = this.bind( this.updateRegExp );
  end.onChanging = this.bind( this.updateRegExp );
  grpL.rb1.addEventListener( "click", this.bind( this.toggleMatch ), false );
  grpL.rb2.addEventListener( "click", this.bind( this.toggleMatch ), false );

  this.setDisabled( grpR.grp1.grp1a );
  this.setDisabled( grpR.grp1.grp1b );
  this.setDisabled( grpR.grp2.grp, true );
  grpL.rb1.value = true;
}


/**
 * Update regex field as the delimiter fields are updated
 **/
UserInterface.prototype.updateRegExp = function()
{
  var sText = this.inputs.start.text.replace( /([^\w])/g, "\\$1" );
  var eText = this.inputs.end.text.replace( /([^\w])/g, "\\$1" );

  var allDelim = "", tt = this.textTypes;
  for ( var delim in tt )
    allDelim += tt[ delim ].start + tt[ delim ].end;  

  var capture1 = "(.+)", capture2 = "";
  if ( eText )
  {
    capture1 = "(.+?)"; // don't grab two instances of a text type in a line
    capture2 = "(.*)"; // capture any trailing text
  }

  // if no delims are set, capture up to the start of another type
  // otherwise, capture everything between the delims.
  // this should always be the last one added TODO: dynamically update
  var captr = ( !sText && !eText ) ?
              "([^" + allDelim.replace(/([\^\-\]\\])/g, "\\$1" ) + "]+)" :
              capture1;

  // capture any text at the end as well for further processing
  this.inputs.regexp.text = "^" + sText + captr + eText + capture2;
};


/**
 * Toggle enabled status of match inputs, and sets/restores radio button value
 **/
// eventlistener fires at different times for cs3/4 so can't use rb.value
// track this on our own
UserInterface.prototype.delimRbValue = true;
UserInterface.prototype.toggleMatch = function( event )
{
  var value = this.delimRbValue;
  var delimRb = this.inputs.delimRb;
  if ( event.target )
  {
    if ( ( event.target == delimRb && value == false ) ||
         ( event.target != delimRb && value == true ) )
      value = !value;
  }
  else
  {
    value = event; // selection changed, restore radio button values
    this.inputs.delimRb.value = value;
    this.inputs.delimRb.parent.rb2.value = !value;
  }
  this.delimRbValue = value;

  var grp1 = this.inputs.start.parent.parent;
  var grp2 = this.inputs.regexp.parent.parent;

  grp1.enabled = value;
  grp1.grp1a.el.enabled = value;
  grp1.grp1b.el.enabled = value;

  grp2.grp.el.enabled = !value;
  grp2.grp.enabled = !value;
};


/**
 * Add fields to input trans text to replace for the text type
 **/
UserInterface.prototype.addReplaceInput = function( inputGrp )
{
  var grp = inputGrp.add( 
    "panel { orientation: 'row', text: 'Replace', \
      replGrp: Group { orientation: 'column', \
                       alignChildren: 'left', \
        grp: Group { \
          chk: Checkbox { name: 'replacechk' }," +
          this.getRes( { lbl: "Replace:", name: "match", grp: "grp1" } ) +
          this.getRes( { lbl: "With:", name: "replace", grp: "grp2" } ) +
        "}," +
      "} \
    }" ).replGrp.grp;

  this.inputs.replaceChk = grp.chk;
  this.inputs.match = grp.grp1.el;
  this.inputs.replace = grp.grp2.el;

  this.setDisabled( grp.grp1, true );
  this.setDisabled( grp.grp2, true );

  grp.chk.addEventListener( "click", this.bind( this.toggleReplace ), false );
};


/**
 * Toggle the enabled state of the replace controls and groups
 **/
UserInterface.prototype.replaceChkValue = false;
UserInterface.prototype.toggleReplace = function( setting )
{
  var value = ( setting.target ) ? !this.replaceChkValue : setting;
  this.inputs.match.enabled = value;
  this.inputs.match.parent.enabled = value;
  this.inputs.replace.enabled = value;
  this.inputs.replace.parent.enabled = value;
  this.replaceChkValue = value;
};


/**
 * Add fields to input font properties for the text type
 **/
UserInterface.prototype.addFontInput = function( inputGrp )
{
  var fontPnl = inputGrp.add(
                "panel { alignChildren: 'left', text: 'Font' }" );

  var font = fontPnl.add( this.getRes( { type: "DropDownList", lbl: "Font:",
                                         name: "font", width: 210 } ) ).el;
  this.populateFontList( font );
  this.inputs.font = font;

  this.addSizeSelect( fontPnl.add( "group {}" ) );
  this.addColorSelect( fontPnl.add( "group {}" ) );
  this.addKernSelect( fontPnl );
};


/**
 * Add buttons for adding and deleting new text types from the list
 **/
UserInterface.prototype.addInputButtons = function( inputGrp )
{
  var inputBtnGrp = inputGrp.add( "group { orientation: 'row' }" );

  var del = inputBtnGrp.add( "button", UND, "Delete" );
  del.addEventListener( "click", this.bind( this.delTextType ), false );

  var add = inputBtnGrp.add( "button", UND, "Add" );
  add.addEventListener( "click", this.bind( this.addTextType ), false );
};


/*****************************************************************************/

/**
 * Load config from file in JSON format
 **/
UserInterface.prototype.loadConfig = function()
{
  var config;
  var cfgFile = new File().openDlg( "Select config", "Ini File: *.ini" );
  if ( cfgFile && cfgFile.exists )
  {
    cfgFile.open( "r" );
    config = cfgFile.read();
    cfgFile.close();


    // clear list and overwrite textTypes with saved values
    this.typeList.removeAll();
    this.textTypes = eval( config );

    for ( var type in this.textTypes ) // re-populate the list
      this.typeList.add( "item", type );
  }
};

/**
 * Save config to file in JSON format
 **/
UserInterface.prototype.saveConfig = function()
{
  var file = new File( "config.ini" );
  var config = file.saveDlg( "Save Config File" );

  if ( !config )
    return;

  var JSON = this.getJSON();

  try {
    config.open( "w" );
    config.write( JSON );
    config.close( JSON )
    // config.execute();
  }
  catch ( e )
  {
    alert( "Error writing config file: "  + e );
  }
};

UserInterface.prototype.getJSON = function()
{
  var JSON = "(function(){return{";
  var str = "", ta = [];

  for ( var t in this.textTypes )
  {
    var tt = this.textTypes[t];
    var pa = [];

    for ( var p in tt )
    {
      var p_str = "";
      switch ( typeof tt[p] )
      {
        case "string":
          p_str += "'" + tt[p].replace(/\\/g, "\\\\") + "'";
          break;
        case "boolean":
          p_str += tt[p];
          break;
        case "object":
          p_str += "[" + tt[p] + "]";
          break;
      }
      pa.push( p + ":" + p_str );
    }

    ta.push( "'" + t + "':{" + pa + "}" );
  }

  JSON += ta;
  JSON += "}})();";

  return JSON;
};

/**
 *  Adds font size and unit selection inputs to the dialog
 **/
UserInterface.prototype.addSizeSelect = function( grp )
{
  var res = this.getRes( { lbl: "Font Size:", name: "size", width: 50 } );
  var size = grp.add( res ).el;
  size.text = "12";

  res = this.getRes( { type: "DropDownList", name: "units", width: 50 } );
  var units = grp.add( res ).el;
  units.add( "item", "px" );
  units.add( "item", "pt" );
  units.selection = 0;

  this.inputs.size = size;
  this.inputs.units = units;
};

/**
 * Adds color selection inputs to the dialog
 **/
UserInterface.prototype.addColorSelect = function( grp )
{
  var res = this.getRes( { type: "Button", name: "color", width: 40 } );
  var colorBtn = grp.add( res ).el;
  var pnl = grp.add( "panel { \
                       value: [0, 0, 0], \
                       st: StaticText { size: [0, 0] } \
                     }" );
  res = this.getRes( { lbl: "Hex #:", width: 60 } );
  var et = grp.add( res ).el;
  var rgb = [];

  colorBtn.text = "Color:";

  var self = this;
  pnl.watch( "value", function( p, o, n )
  {
    self.colorUpdate( p, o, n, rgb, et, this );
    return n;
  } );
  pnl.value = [0, 0, 0];

  et.addEventListener( "changing", function( e )
  {
    self.hexWatch( e, rgb, pnl );
  }, false );

  colorBtn.addEventListener( "click", this.bind( function( event )
  {
    var color = this.getColor( { red: rgb[0], green: rgb[1], blue: rgb[2] } );
    if ( color )
      pnl.value = color;
  } ), false );

  this.inputs.color = pnl;
};

/**
 *  Update color of box to show the currently selected color
 **/
UserInterface.prototype.colorUpdate = function( p, o, n, rgb, et, pnl )
{
  function toHex( num )
  {
    return ( num ) ? Number( num ).toString( 16 ) : "00";
  }

  if ( n )
  {
    var g = pnl.graphics;
    rgb[ 0 ] = n[ 0 ]; rgb[ 1 ] = n[ 1 ]; rgb[ 2 ] = n[ 2 ];
    var c = [ n[ 0 ]/255, n[ 1 ]/255, n[ 2 ]/255 ];
    g.backgroundColor = g.newBrush( g.BrushType.SOLID_COLOR, c );
    et.text = toHex( n[ 0 ] ) + toHex( n[ 1 ] ) + toHex( n[ 2 ] );
    return n;
  }
  return o;
}

/**
 * Update color selection base on changes in the hex value entered
 **/
UserInterface.prototype.hexWatch = function( e, rgb, pnl )
{
  var text = e.target.text;
  if ( text.length == 6 )
  {
    var val = parseInt( text, 16 );
    rgb[ 0 ] = val >> 16;
    rgb[ 1 ] = ( val >> 8 ) & 0xFF;
    rgb[ 2 ] = val & 0xFF;
    pnl.value = rgb;
  }
}


/**
 * Adds kern type selection input to the dialog
 **/
UserInterface.prototype.addKernSelect = function( fontPnl )
{
  var res = this.getRes( { type: "DropDownList", lbl: "Kerning:",
                           name: "kern", width: 120 } );
  var kern = fontPnl.add( res ).el;
  kern.add( "item", "Optical" );
  kern.add( "item", "Manual" );
  kern.add( "item", "Metrics" );
  kern.selection = 0;

  this.inputs.kern = kern;
};


/**
 * Disable a input and set its color to gray
 **/
UserInterface.prototype.setDisabled = function( ctrl, disable )
{
  var graphics = ctrl.graphics;
  graphics.disabledBackgroundColor = graphics.newBrush( 
    graphics.BrushType.SOLID_COLOR, [0.9,0.9,0.9] );
  if ( disable )
    ctrl.enabled = false;
};

/**
 * Enable a disabled control
 **/
UserInterface.prototype.enableControl = function( ctrl )
{
  ctrl.enabled = true;
}


/**
 * Pop up the system color selection dialog
 **/
UserInterface.prototype.getColor = function( clr )
{
  var rgb = ( clr || app.foregroundColor.rgb );

  var r, g, b;
  r = g = b = 0;

  var bytes = ( rgb.red << 16 ) + ( rgb.green << 8 ) + rgb.blue;
  bytes = $.colorPicker( bytes );
  if ( bytes > 0 )
  {
    if ( bytes != -1 )
    {
      r = bytes >> 16;
      g = ( bytes >> 8 ) & 0xFF;
      b = bytes & 0xFF;
    }
    return [r, g, b];
  }
};


/**
 * Add a new text type to the list
 **/
UserInterface.prototype.addTextType = function( inputs )
{
  var type = new TypeHolder( this.inputs, this.textTypes );

  var item = this.typeList.add( "item", type.label );
  this.textTypes[ type.label ] = type; // store it here too

  item.selected = true;
};


/**
 * Delete a text type from the list
 **/
UserInterface.prototype.delTextType = function()
{
  if ( !this.typeList.selection )
    return;

  delete this.textTypes[ this.typeList.selection.text ];

  var next = ( this.typeList.selection ) ? 
             this.typeList.selection.index - 1 : 0;
  this.typeList.remove( this.typeList.selection );
  this.typeList.selection = ( next > -1 ) ? next : 0;
};


/**
 * Populate the font selection list with all the installed fonts
 **/
UserInterface.prototype.populateFontList = function( list )
{
  try {
    for ( var i = 0; i < app.fonts.length; i++ )
      list.add( "item", app.fonts[ i ].postScriptName );

    list.selection = 0;
  }
  catch ( e )
  {
  }
};


/**
 * Show a file selection dialog
 **/
UserInterface.prototype.selectTrans = function( transPth, start )
{
  var transFile = start.openDlg( "Select translation", "Text File: *.txt" );
  if ( transFile && transFile.type )
  {
    transPth.text = transFile.fsName;
    this.transFile = transFile;

    this.dialog.testButton.enabled = true;

    if ( this.imgDir )
      this.dialog.defaultElement.enabled = true;
  }
};


/**
 * Show a folder selection dialog
 **/
UserInterface.prototype.selectFolder = function( imgPth, start )
{
  var imgDir = start.selectDlg( "Select image directory" );
  if ( imgDir )
  {
    imgPth.text = imgDir.fsName;
    this.imgDir = imgDir;

    if ( this.transFile )
      this.dialog.defaultElement.enabled = true;
  }
};



/*****************************************************************************/
/*****************************************************************************/
/*****************************************************************************/



/**
 * Object that takes the parsed trans then places the text on the pages
 **/
function Processor( imgDir, trans, textTypes )
{
  this.imgDir = imgDir;
  this.trans = trans.getPages();
	this.textTypes = textTypes;

  this.setUnits();
  this.setFonts();
  this.processPages();

  this.restoreUnits();

  this.imgDir = this.trans = null;
}


Processor.prototype.units = {
  rulerUnits: null,
  typeUnits: null
};
Processor.prototype.imgDir = null;
Processor.prototype.trans = null;


Processor.prototype.bind = function( func )
{
  var p = this;
  var args = Array.prototype.slice.call( arguments, 1 );
  var b = function()
  {
    var allArgs = args.concat( Array.prototype.slice.call( arguments ) );
    return func.apply( p, allArgs );
  };
  return b;
};



/*****************************************************************************/


/**
 * Set the units to those expected by this script and save the current units
 **/
Processor.prototype.setUnits = function()
{
  try {
    // save units settings
    this.units.rulerUnits = preferences.rulerUnits;
    this.units.typeUnits = preferences.typeUnits;

    // set units values to defaults
    preferences.rulerUnits = Units.PIXELS;
    preferences.typeUnits = TypeUnits.PIXELS;
  }
  catch ( e )
  {
  }
};


/**
 * Restore original units
 **/
Processor.prototype.restoreUnits = function()
{
  preferences.rulerUnits = this.units.rulerUnits; 
  preferences.typeUnits = this.units.typeUnits;
  this.units.rulerUnits = this.units.typeUnits = null;
};


/**
 * Parse the text types and set the desired font for each type
 **/
Processor.prototype.setFonts = function()
{
  var ver = Number( app.scriptingVersion.substring( 0, 2 ) );

  for ( var type in this.textTypes )
  {
    var typeObj = this.textTypes[ type ];

    var color = new SolidColor();
    color.rgb = new RGBColor();

    var c = typeObj.color;
    color.rgb.red = c[ 0 ];
		color.rgb.green = c[ 1 ];
		color.rgb.blue = c[ 2 ];
    typeObj.color = color;

    var size = new UnitValue( typeObj.size, typeObj.units );

    // cs4 sizes are instances of UnitValue
    if ( ver >= 11 )
      typeObj.size = size;
    else if ( typeObj.units == "px" ) // version < cs4, do conversion to pt
      typeObj.size = size.as( "pt" );
  }
};


/**
 * Start opening pages and adding text to them
 **/
Processor.prototype.processPages = function()
{
  this.closeAll();
  var psdRe = /\.psd$/i;

  for ( var pg in this.trans )
  {
    var page = this.getPage( pg, this.imgDir );

    if ( page )
    {
      var doc = open( page );
      this.addText( doc, this.trans[ pg ] );

      if ( psdRe.test( doc.name ))
      {
        doc.save();
        doc.close();
      }
      else
      {
        var saveOpt = new PhotoshopSaveOptions();
        doc.saveAs( doc.fullName, saveOpt, true, Extension.LOWERCASE );
        doc.close();
      }
    }
  }
};


/*****************************************************************************/


/**
 * Close all open documents
 **/
Processor.prototype.closeAll = function()
{
  while ( documents.length )
    documents[0].close();    
};



/**
 * Get the psd image file corresponding to a page number
 **/
Processor.prototype.getPage = function( number, imgDir )
{
  var filter = function( file )
  {
    var fileRe = new RegExp( ".*" + number + "\.(?:psd|png|jpg)" );
    return fileRe.test( file.name );
  }
  var page = imgDir.getFiles( filter );

  return page[0];
};


/**
 * Add text from the trans to the psd
 **/
Processor.prototype.addText = function( doc, text )
{
  var textSet = this.getTextSet( doc );
  var base, baseLayers = {};

  // change resolution of image to 72
  activeDocument.resizeImage( null, null, 72, ResampleMethod.NONE );

  for ( var i = 0, line; line = text[i]; i++ )
  {
    var layer, textItem; // the new text layer and text item for the next line

    if ( baseLayers[ line.type ] )
    {
      layer = baseLayers[ line.type ].duplicate();
      textItem = layer.textItem;      
    }
    else if ( base )
    {
      layer = base.duplicate();
      textItem = layer.textItem;
      this.setTextProps( textItem, this.textTypes[ line.type ] );
      baseLayers[ line.type ] = layer;
    }
    else
    {
      layer = textSet.artLayers.add();
      layer.kind = LayerKind.TEXT;
      textItem = layer.textItem;

      this.setTextFormat( textItem, this.textTypes[ line.type ] );
      this.setTextProps( textItem, this.textTypes[ line.type ] );

      base = layer;
      baseLayers[ line.type ] = layer;
    }

    layer.moveToEnd( textSet );
    this.positionText( textItem, line.text );
    textItem.contents = line.text;
  }
};


/*****************************************************************************/


/**
 * Get the layer set called "Text", or create it, and then return the set
 **/
Processor.prototype.getTextSet = function( doc )
{
  var textSet;
  try {
    textSet = doc.layerSets.getByName( "Text" );
  }
  catch ( e )
  {
    textSet = doc.layerSets.add();
    textSet.move( doc, ElementPlacement.PLACEATBEGINNING );
    textSet.name = "Text";
  }
  return textSet;
};


/**
 * Set basic properties of the text
 **/
Processor.prototype.setTextProps = function( textItem, typeObj )
{
  textItem.font = typeObj.font;
  textItem.size = typeObj.size;
  textItem.color = typeObj.color;
};


/**
 * General formatting to apply to all lines
 * Need options for these
 */
Processor.prototype.setTextFormat = function( textItem, typeObj )
{
  try {
    textItem.kind = TextType.PARAGRAPHTEXT;
    textItem.hyphenation = false;
    textItem.antiAliasMethod = AntiAlias.SMOOTH;

    // kern = MANUAL, METRICS, or OPTICAL
    textItem.autoKerning = AutoKernType[ typeObj.kern.toUpperCase() ]; 
    textItem.justification = Justification.CENTER;
  }
  catch ( e )
  {
  }
};


/**
 * Size the textbox and position on the page
 **/
Processor.prototype.positionText = function( textItem, text )
{
  textItem.height = text.length*textItem.size*0.05 + 75;
  textItem.width = text.length*textItem.size*0.03 + 81;
  textItem.position = Array( 0, 0 );
};



/*****************************************************************************/
/******* Let's begin *********************************************************/
/*****************************************************************************/


new UserInterface();
