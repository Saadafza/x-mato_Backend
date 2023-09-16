// @ts-nocheck

const stripe = require('stripe')(process.env.STRIPE_KEY);
// order controller
const express = require('express')
const app = express();

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({

    async create(ctx) {
        const { products } = ctx.request.body;
        const lineItems = await Promise.all(
            products.map(async (product) => {
                const item = await strapi.service('api::product:product').findOne(product.id);
                return {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: item.title,
                        },
                        unit_amount: item.price * 100
                    },
                    quantity: item.quantity
                };

            })
        )

        try {
            const session = await stripe.checkout.sessions.create({
                mode: 'payment',
                success_URL: `${process.env.CLIENT_URL}?success=true`,
                cancel_URL: `${process.env.CLIENT_URL}?success=false`,
                line_items: lineItems,
                shipping_address_collection: { allowed_countries: ["NP", "IND"] },
                payment_method_types: ["card"],

            });

            await strapi.service("api::order:order").create({
                data: {
                    products,
                    stripeId: session.id,

                },
            });
            return { stripeSession: session }

        } catch (error) {
            console.log(`Error found: ${error}`)
        }
    }
}))