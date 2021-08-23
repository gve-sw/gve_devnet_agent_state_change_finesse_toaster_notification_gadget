/*
Copyright (c) 2021 Cisco and/or its affiliates.

This software is licensed to you under the terms of the Cisco Sample
Code License, Version 1.1 (the "License"). You may obtain a copy of the
License at

               https://developer.cisco.com/docs/licenses

All use of the material herein must be in accordance with the terms of
the License. All rights not expressly granted by the License are
reserved. Unless required by applicable law or agreed to separately in
writing, software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
or implied.

*/

var finesse = finesse || {};
finesse.gadget = finesse.gadget || {};
finesse.container = finesse.container || {};
clientLogs = finesse.cslogger.ClientLogger || {};  // for logging

/**
 * The following comment prevents JSLint errors concerning the logFinesse function being undefined.
 * logFinesse is defined in Log.js, which should also be included by gadget the includes this file.
 */
/*global logFinesse */

/** @namespace */
finesse.modules = finesse.modules || {};
finesse.modules.ToasterNotificationGadget = (function ($) {
    var user, states, dialogs, clientlogs,

    /**
     * Populates the fields in the gadget with data
     */
    render = function () {
        var currentState = user.getState();

        // Examples of getting data from the User object (GET)
        $("#userId").text(user.getId());
        $("#firstName").text(user.getFirstName());
        $("#lastName").text(user.getLastName());
        if (user.hasSupervisorRole()) {
            $("#userRole").text('Supervisor');
        } else {
            $("#userRole").text('Agent');
        }
        $("#extension").text(user.getExtension());
        $("#userState").text(currentState);

        // Example of setting the user state (PUT)
        if (currentState === states.NOT_READY) {
            $("#goReady").show();
            $("#goNotReady").hide();
        } else if (currentState === states.READY) {
            $("#goNotReady").show();
            $("#goReady").hide();
        } else {
            $("#goNotReady").hide();
            $("#goReady").hide();
        }
        
        gadgets.window.adjustHeight();
    },

    displayCall = function (dialog) {
        var callVars = dialog.getMediaProperties();

        // Examples of getting data from the Dialog object (GET)
        $("#dnis").text(dialog.getMediaProperties().DNIS);
        $("#callType").text(dialog.getMediaProperties().callType);
        $("#fromAddress").text(dialog.getFromAddress());
        $("#toAddress").text(dialog.getToAddress());
        $("#callState").text(dialog.getState());

        // Hide the make call button when the user is on a call
        $("#makeCallButton").hide();

        // Example of using data from the dialog to do a web search
        $("#bing").attr("src","https://www.bing.com/search?q=" + callVars["callVariable3"]);
    },

    _processCall = function (dialog) {
        displayCall(dialog);
    },

    /**
     *  Handler for additions to the Dialogs collection object. This will occur when a new
     *  Dialog is created on the Finesse server for this user.
     */
    handleNewDialog = function(dialog) {
        // call the displayCall handler
        displayCall(dialog);

        // add a dialog change handler in case the callvars didn't arrive yet
        dialog.addHandler('change', _processCall);
    },
     
    /**
     *  Handler for deletions from the Dialogs collection object for this user. This will occur
     *  when a Dialog is removed from this user's collection (example, end call)
     */
    handleEndDialog = function(dialog) {
        // Clear the fields when the call is ended
        $("#callId").text("");
        $("#dnis").text("");
        $("#callType").text("");
        $("#fromAddress").text("");
        $("#toAddress").text("");
        $("#callState").text("");

        // Show the make call button when the call is ended
        $("#makeCallButton").show();

        // Remove the dialog data from the web search
        $("#bing").attr("src","https://www.bing.com");
    },

    /**
     * Handler for makeCall when successful.
     */
    makeCallSuccess = function(rsp) { },
    
    /**
     * Handler for makeCall when error occurs.
     */
    makeCallError = function(rsp) { },

    /**
     * Handler for the onLoad of a User object. This occurs when the User object is initially read
     * from the Finesse server. Any once only initialization should be done within this function.
     */
    handleUserLoad = function (userevent) {
        // Get an instance of the dialogs collection and register handlers for dialog additions and
        // removals
        dialogs = user.getDialogs( {
            onCollectionAdd : handleNewDialog,
            onCollectionDelete : handleEndDialog
        });

        render();
    },
      
    /**
     *  Handler for all User updates
     */
    handleUserChange = function(userevent) {
        var theCurrentState = user.getState();
        if (theCurrentState === states.NOT_READY) {
            clientLogs.log("========== ATTEMPTING TOASTER ==========");
            var theNotReadyReasonCode = user.getNotReadyReasonCodeId();
            var theToasterText='';
            if (theNotReadyReasonCode=='35') theToasterText='Your Extension is out of service';
            if (theNotReadyReasonCode=='38') theToasterText='Your Extension is back in service';
            if (theToasterText!='') {
                finesse.containerservices.FinesseToaster.showToaster(
                    'Agent Phone Status Alert', {
                        body: theToasterText,
                        showWhenVisible: true
                    }
                );
            }
        }
        render();
    };

    /** @scope finesse.modules.ToasterNotificationGadget */
    return {
        /**
         * Sets the user state
         */
        setUserState : function (state) {
            clientLogs.log("setUserState(): The user's current state is: " + state);
            if (state === 'READY') {
                user.setState(states.READY);
            } else if (state === 'NOT_READY') {
                user.setState(states.NOT_READY);
            }
        },

        /**
         * Make a call to the number
         */
        makeCall : function (number) {
            clientLogs.log("makeCall(): Making a call to " + number);
            // Example of the user make call method
            user.makeCall(number, {
                success: makeCallSuccess,
                error: makeCallError
            });

            // Hide the button after making the call
            $("#makeCallButton").hide();
        },

        /**
         * Performs all initialization for this gadget
         */
        init : function () {
            var cfg = finesse.gadget.Config;

            clientLogs = finesse.cslogger.ClientLogger;  // declare clientLogs

            gadgets.window.adjustHeight();

            // Initiate the ClientServices and load the user object. ClientServices are
            // initialized with a reference to the current configuration.
            finesse.clientservices.ClientServices.init(cfg, false);

            // Initiate the ClientLogs. The gadget id will be logged as a part of the message
            clientLogs.init(gadgets.Hub, "ToasterNotificationGadget");

            // initiate Toaster services
            finesse.containerservices.FinesseToaster.init(cfg,clientLogs);


            user = new finesse.restservices.User({
                id: cfg.id, 
                onLoad : handleUserLoad,
                onChange : handleUserChange
            });

            states = finesse.restservices.User.States;
            
            // Initiate the ContainerServices and add a handler for when the tab is visible
            // to adjust the height of this gadget in case the tab was not visible
            // when the html was rendered (adjustHeight only works when tab is visible)
            containerServices = finesse.containerservices.ContainerServices.init();
            containerServices.addHandler(finesse.containerservices.ContainerServices.Topics.ACTIVE_TAB, function() {
                clientLogs.log("Gadget is now visible");  // log to Finesse logger
                // automatically adjust the height of the gadget to show the html
                gadgets.window.adjustHeight();
            });
            containerServices.makeActiveTabReq();
            //containerServices.hideDialog();
        }
    };
}(jQuery));