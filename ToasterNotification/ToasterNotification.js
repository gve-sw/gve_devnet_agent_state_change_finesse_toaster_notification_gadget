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
    };

    /** @scope finesse.modules.ToasterNotificationGadget */
    return {
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
        }
    };
}(jQuery));