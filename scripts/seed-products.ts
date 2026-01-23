import { getUncachableStripeClient } from '../server/stripeClient';

async function createSubscriptionProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating BrightBoard subscription products...');

  // Check if products already exist
  const existingProducts = await stripe.products.search({ query: "name:'BrightBoard Premium'" });
  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping creation');
    return;
  }

  // Create BrightBoard Premium product
  const product = await stripe.products.create({
    name: 'BrightBoard Premium',
    description: 'Full access to all BrightBoard features including premium animation effects, HD/4K image quality, and unlimited content generation.',
    metadata: {
      tier: 'premium',
      features: 'unlimited_content,premium_animations,hd_quality,4k_quality,priority_support'
    }
  });

  console.log('Created product:', product.id);

  // Create weekly price - $4.99/week
  const weeklyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 499, // $4.99
    currency: 'usd',
    recurring: { interval: 'week' },
    metadata: { tier: 'weekly' }
  });
  console.log('Created weekly price:', weeklyPrice.id, '- $4.99/week');

  // Create monthly price - $14.99/month (save ~25%)
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 1499, // $14.99
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'monthly' }
  });
  console.log('Created monthly price:', monthlyPrice.id, '- $14.99/month');

  // Create yearly price - $99.99/year (save ~60%)
  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 9999, // $99.99
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { tier: 'yearly' }
  });
  console.log('Created yearly price:', yearlyPrice.id, '- $99.99/year');

  console.log('\nSubscription products created successfully!');
  console.log('Price IDs:');
  console.log('  Weekly:', weeklyPrice.id);
  console.log('  Monthly:', monthlyPrice.id);
  console.log('  Yearly:', yearlyPrice.id);
}

createSubscriptionProducts().catch(console.error);
