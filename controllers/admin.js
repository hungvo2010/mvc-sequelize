const deleteFile = require('../util/deleteFile');
const AppError = require('../util/AppError');
const adminModel = require('../models/Admin');

const ITEMS_PER_PAGE = 2; 

exports.getAddProduct = (req, res, next) => {
	res.render('admin/edit-product', {
		pageTitle: 'Add Product',
		path: '/admin/add-product', 
		editMode: false, // in Add Product page
		errorMessage: ''
	});
};

exports.postAddProduct = async (req, res, next) => {
	const {title, price, description} = req.body;
	const image = req.file;

	if (!image){
		return res.render('admin/edit-product', {
			pageTitle: 'Add Product',
			path: '/admin/add-product', 
			editMode: false, // in Add Product page
			errorMessage: 'Your file attached is not valid.'
		});
	}

	try {
		await adminModel.createProduct({
			title,
			imageUrl: image.path,
			price,
			description,
			userId: req.user.id,
		});
		res.redirect('/admin/products');
	}

	catch (err) {
		return next(new AppError(err));
	}
};

exports.getProducts = async (req, res, next) => {
    const page = req.query.page || Math.max(1, +page);

    try {
        const totalItems = await adminModel.countAdminProducts();
        const lastPage = Math.ceil(totalItems / ITEMS_PER_PAGE);
        const products = await adminModel.getAdminProducts(req.user.id, (page - 1) * ITEMS_PER_PAGE, ITEMS_PER_PAGE);

        res.render('admin/products', {
			prods: products,
			pageTitle: 'Admin Products',
			path: '/admin/products',
			currentPage: +page,
			lastPage
        });
    }

    catch (err) {
        return next(new AppError(err));
    }
};

exports.postEditProduct = async (req, res, next) => {

	const newImage = req.file;
	const {productId, newTitle, newPrice, newDescription} = req.body;

	try {
		let product = await adminModel.findProduct(productId, req.user.id);
		if (!product){
			return res.redirect('/admin/products');
		}
		const newProduct = {
			title: newTitle,
		}
		if (newImage){
			deleteFile(product.imageUrl);
			newProduct.imageUrl = newImage.path;      
		}
		newProduct.price = newPrice;
		newProduct.description = newDescription;
		await adminModel.updateProduct(productId, newProduct);
		res.redirect('/admin/products');
	}

	catch (err){
		return next(new AppError(err));
	}
}

exports.getEditProduct = async (req, res, next) => {
	const productId = req.params.productId;
	try {
		const product = await adminModel.findProduct(productId, req.user.id);
		if (!product){
			return res.redirect('/admin/products');
		}

		res.render("admin/edit-product", {
			product,
			pageTitle: 'Edit Product',
			path: req.url,
			editMode: req.query.editMode, // in Edit Product page
			errorMessage: ''
		})
	}

	catch (err) {
		return next(new AppError(err));
	}
};

exports.postDeleteProduct = async (req, res, next) => {
	const productId = req.params.productId;
	try {
		const product = await adminModel.findProduct(productId, req.user.id);
		
		if (!product){
			return res.redirect('/admin/products');
		}
		
		deleteFile(product.imageUrl);
		adminModel.deleteProduct(productId);
		res.status(200).json({});
	}
	
	catch(err) {
		return next(new AppError(err));
	}
}