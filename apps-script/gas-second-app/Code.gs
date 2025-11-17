/**
 * Creates or refreshes a Google Form for capturing pizza orders.
 *
 * The script stores the created form's ID in the script properties so that it
 * can be updated safely on subsequent executions without generating duplicate
 * forms. Calling the function again will reset the questions so that tweaks to
 * the structure are reflected in the live form.
 */
function createPizzaOrderForm() {
  const props = PropertiesService.getScriptProperties();
  const storedFormId = props.getProperty('PIZZA_ORDER_FORM_ID');
  const formTitle = 'Pizza Order Form';
  let form;

  if (storedFormId) {
    try {
      form = FormApp.openById(storedFormId);
      form.setTitle(formTitle);
      form.deleteAllItems();
    } catch (error) {
      // If the stored ID is invalid or the form was deleted, create a new one.
      form = FormApp.create(formTitle);
      props.setProperty('PIZZA_ORDER_FORM_ID', form.getId());
    }
  } else {
    form = FormApp.create(formTitle);
    props.setProperty('PIZZA_ORDER_FORM_ID', form.getId());
  }

  form.setDescription(
    'Use this form to place a pizza order. We will confirm your order once we receive it.'
  );

  // Contact information section.
  form.addSectionHeaderItem().setTitle('Contact information');
  form.addTextItem().setTitle('Full name').setRequired(true);
  form.addTextItem().setTitle('Email address').setRequired(true);
  form.addTextItem().setTitle('Phone number').setRequired(true);

  // Order preferences section.
  form.addSectionHeaderItem().setTitle('Order details');
  form
    .addMultipleChoiceItem()
    .setTitle('Order type')
    .setChoices([
      form.createChoice('Delivery'),
      form.createChoice('Pick-up'),
    ])
    .showOtherOption(false)
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('Pizza size')
    .setChoices([
      form.createChoice('Small (10")'),
      form.createChoice('Medium (12")'),
      form.createChoice('Large (14")'),
      form.createChoice('Extra large (16")'),
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('Crust style')
    .setChoices([
      form.createChoice('Hand tossed'),
      form.createChoice('Thin crust'),
      form.createChoice('Deep dish'),
      form.createChoice('Gluten-free'),
      form.createChoice('Cauliflower'),
    ])
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('Toppings (choose all that apply)')
    .setChoices([
      form.createChoice('Pepperoni'),
      form.createChoice('Sausage'),
      form.createChoice('Ham'),
      form.createChoice('Bacon'),
      form.createChoice('Chicken'),
      form.createChoice('Mushrooms'),
      form.createChoice('Onions'),
      form.createChoice('Green peppers'),
      form.createChoice('Black olives'),
      form.createChoice('Pineapple'),
      form.createChoice('Jalapeños'),
      form.createChoice('Extra cheese'),
    ]);

  form
    .addCheckboxItem()
    .setTitle('Extras (optional)')
    .setChoices([
      form.createChoice('Garlic knots'),
      form.createChoice('Salad'),
      form.createChoice('Wings'),
      form.createChoice('Soda'),
      form.createChoice('Dessert'),
    ]);

  form
    .addParagraphTextItem()
    .setTitle('Special instructions')
    .setHelpText('Let us know about allergies, substitutions, or delivery notes.');

  form.addSectionHeaderItem().setTitle('Scheduling & payment');
  form
    .addDateTimeItem()
    .setTitle('Preferred delivery/pick-up time')
    .setHelpText('We will confirm if this time is available.');

  form
    .addMultipleChoiceItem()
    .setTitle('Payment method')
    .setChoices([
      form.createChoice('Pay online'),
      form.createChoice('Pay on delivery'),
      form.createChoice('Pay at pick-up'),
    ])
    .setRequired(true);

  form
    .addTextItem()
    .setTitle('Delivery address (if requesting delivery)')
    .setHelpText('Leave blank for pick-up orders.');

  Logger.log('Form ready: %s', form.getEditUrl());
  return form.getPublishedUrl();
}
