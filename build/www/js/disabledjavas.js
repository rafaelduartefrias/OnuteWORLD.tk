// Check if localstorage is present or not in the browser
// If localstorage is not present you can use cookies as well to achieve this
// or you can send a call to the server to manage this 
if (window.localStorage) {
  // Check if the user is already accepted the cookie policy
  if (!localStorage.getItem("userAgreed")) {
    jQuery("#popup1").show();
  } else {
    jQuery("#popup1").hide();
  }
}

// Handle Ok button click, and set a localstorage key-value pair the user is accepted the cookie popup
// So that from the next time onwards popup is not visible to returning user
jQuery("#popup1 button").on("click", function(event) {
  event.preventDefault();
  // Make a server call if you want to handle it in server side here
  localStorage.setItem("userAgreed", true);
  jQuery("#popup1").hide();
});

// On click of close button
jQuery("#popup1 a.close").on("click", function(event) {
  event.preventDefault();
  jQuery("#popup1").hide();
});