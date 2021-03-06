const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createProduct(product){
    await prisma.product.create({
        data: product
    });
}

async function createMultipleProducts(products){
    await prisma.product.createMany({
        data: products
    })
}

async function countAdminProducts(userId){
    return prisma.product.count({
        where: {
            userId: userId
        }
    })
}

async function getSellerProducts(userId){
    return await prisma.product.findMany({
        where: {
            sellerId: userId,
        }
    })
}

async function findProduct(productId, userId){
    return await prisma.product.findFirst({
        where: {
            userId,
            id: productId
        }
    })
}

async function updateProduct(productId, newProduct){
    await prisma.product.update({
        where: {
            id: productId
        },
        data: newProduct
    })
}

async function deleteProduct(productId){
    await prisma.product.delete({
        where: {
            id: productId
        }
    })
}

module.exports = {
    createProduct,
    createMultipleProducts,
    countAdminProducts,
    findProduct,
    getSellerProducts,
    updateProduct,
    deleteProduct
}