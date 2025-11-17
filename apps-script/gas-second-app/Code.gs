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
  const orderTypeItem = form.addMultipleChoiceItem();
  orderTypeItem
    .setTitle('Order type')
    .setChoices(createChoices(orderTypeItem, ['Delivery', 'Pick-up']))
    .showOtherOption(false)
    .setRequired(true);

  const pizzaSizeItem = form.addMultipleChoiceItem();
  pizzaSizeItem
    .setTitle('Pizza size')
    .setChoices(
      createChoices(pizzaSizeItem, [
        'Small (10")',
        'Medium (12")',
        'Large (14")',
        'Extra large (16")',
      ])
    )
    .setRequired(true);

  const crustStyleItem = form.addMultipleChoiceItem();
  crustStyleItem
    .setTitle('Crust style')
    .setChoices(
      createChoices(crustStyleItem, [
        'Hand tossed',
        'Thin crust',
        'Deep dish',
        'Gluten-free',
        'Cauliflower',
      ])
    )
    .setRequired(true);

  const toppingsItem = form.addCheckboxItem();
  toppingsItem
    .setTitle('Toppings (choose all that apply)')
    .setChoices(
      createChoices(toppingsItem, [
        'Pepperoni',
        'Sausage',
        'Ham',
        'Bacon',
        'Chicken',
        'Mushrooms',
        'Onions',
        'Green peppers',
        'Black olives',
        'Pineapple',
        'Jalapeños',
        'Extra cheese',
      ])
    );

  const extrasItem = form.addCheckboxItem();
  extrasItem
    .setTitle('Extras (optional)')
    .setChoices(createChoices(extrasItem, ['Garlic knots', 'Salad', 'Wings', 'Soda', 'Dessert']));

  form
    .addParagraphTextItem()
    .setTitle('Special instructions')
    .setHelpText('Let us know about allergies, substitutions, or delivery notes.');

  form.addSectionHeaderItem().setTitle('Scheduling & payment');
  form
    .addDateTimeItem()
    .setTitle('Preferred delivery/pick-up time')
    .setHelpText('We will confirm if this time is available.');

  const paymentMethodItem = form.addMultipleChoiceItem();
  paymentMethodItem
    .setTitle('Payment method')
    .setChoices(createChoices(paymentMethodItem, ['Pay online', 'Pay on delivery', 'Pay at pick-up']))
    .setRequired(true);

  form
    .addTextItem()
    .setTitle('Delivery address (if requesting delivery)')
    .setHelpText('Leave blank for pick-up orders.');

  Logger.log('Form ready: %s', form.getEditUrl());
  return form.getPublishedUrl();
}

function createChoices(item, values) {
  return values.map(value => item.createChoice(value));
}
