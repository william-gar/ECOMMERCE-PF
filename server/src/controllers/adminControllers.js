const HttpError = require("../errors/http-error");
const libros = require("../../data/dataBook.json");
const { Categories, Books, User, Order } = require("../db");
const {
  thereIsUserById,
  thereIsEmail,
} = require("../util/helpers/db-validators");

const adminControllers = {
  createBook: async (req, res, next) => {
    const {
      title,
      authors,
      publisher,
      ISBN,
      imageLinks,
      description,
      stock,
      price,
      categories,
    } = req.body;
    try {
      const books = await Books.findOne({ where: { title } });
      if (books) throw new HttpError("El libro ya existe", 400);
      else {
        const createBook = await Books.create({
          title,
          authors,
          publisher,
          ISBN,
          imageLinks,
          description,
          stock,
          price,
        });
        categories.forEach((el) =>
          Categories.findOrCreate({ where: { name: el } })
        );
        const typeofBooks = await Categories.findAll({
          where: { name: categories },
        });
        //console.log(typeofBooks.JSON())
        createBook.addCategories(typeofBooks);
        return res.send("El libro fue creado");
      }
    } catch (error) {
      if (!(error instanceof HttpError)) {
        error = new HttpError(
          "No se pudo crear el libro, intente nuevamente más tarde",
          500
        );
      }
      return next(error);
    }
  },
  deleteBook: async (req, res) => {
    try {
      const { idBook } = req.params;

      const book = await Books.findByPk(idBook);
      console.log(book);
      if (!book) throw "El libro no existe";

      await Books.update(
        {
          activado: !book.activado,
        },
        { where: { id: idBook } }
      );

      return res.status(200).send("La acción de realizo con éxito!!");
    } catch (error) {
      return res.status(400).send(error);
    }
  },
  updateBook: async (req, res) => {
    try {
      const { idBook } = req.params;
      const {
        title,
        authors,
        publisher,
        ISBN,
        imageLinks,
        description,
        stock,
        price,
        categories,
      } = req.body;

      const bookExist = await Books.findAll({
        where: {
          id: idBook,
        },
      }).catch((err) => {
        return { error: err };
      });

      if (Array.isArray(bookExist)) {
        await Books.update(
          {
            title,
            authors,
            publisher,
            ISBN,
            imageLinks,
            description,
            stock,
            price,
          },
          { where: { id: idBook } }
        );

        const categorieFound = await Categories.findAll({
          where: {
            name: categories,
          },
        });

        const arrayIdCategories = categorieFound.map((el) => el.id);

        const book = await Books.findByPk(idBook);

        book.setCategories(arrayIdCategories);

        res.status(200).json(true);
      } else {
        throw "No se encontro productos";
      }
    } catch (error) {
      res.status(400).json(error);
    }
  },
  //OPERACIONES CATEGORIA
  createCategory: async (req, res) => {
    try {
      const { name, imageLinks } = req.body;
      const category = await Categories.findOne({ where: { name } });
      if (category) throw "La categoria Existe!!";

      await Categories.create({
        name,
        imageLinks,
      });

      return res.status(200).json("La categoria se creo correctamente!!");
    } catch (error) {
      return res.status(400).json(error);
    }
  },
  updateCategory: async (req, res, next) => {
    try {
      const { idCategory } = req.params;
      const { name, imageLinks } = req.body;

      await Categories.update(
        {
          name,
          imageLinks,
        },
        { where: { id: idCategory } }
      );

      return res.status(200).json("Se edito correctamente!!");
    } catch (error) {
      if (!(error instanceof HttpError)) {
        error = new HttpError(
          "No se pudo editar la categoria, intente nuevamente más tarde",
          500
        );
      }
      return next(error);
    }
  },
  deleteCategory: async (req, res) => {
    try {
      const { idCategory } = req.params;

      const category = await Categories.findByPk(idCategory);

      if (!category) throw "La categoria no existe";

      await Categories.update(
        {
          activado: !category.activado,
        },
        { where: { id: idCategory } }
      );
      res.status(200).json("Se elimino correctamente!!");
    } catch (error) {
      res.status(400).json(error);
    }
  },
  //OPERACIONES DE USUARIOS ADMIN
  getUserByEmail: async (req, res, next) => {
    const { email } = req.body;

    try {
      const user = await thereIsEmail(email);

      res.status(200).json({
        status: 1,
        message: "Usuario por email",
        data: user,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: 0,
        message: "No se pudo realizar la operación",
      });
    }
  },
  getUserById: async (req, res, next) => {
    const { idUser } = req.params;
    console.log(idUser);

    try {
      const user = await thereIsUserById(idUser);

      res.status(200).json({
        status: 1,
        message: "Usuario por id es",
        data: user,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: 0,
        message: "No se pudo realizar la operación",
      });
    }
  },
  getAllUsers: async (req, res, next) => {
    try {
      const user = await User.findAll();

      res.status(200).json({
        status: 1,
        message: "Usuarios obtenidos",
        data: user,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: 0,
        message: "No se pudo realizar la operación",
      });
    }
  },
  // OPERACIONES DE ORDENES
  getOrderByUser: async (req, res) => {
    const { email } = req.query;
    try {
      const user = await thereIsEmail(email);

      if (!user) {
        return res.status(404).json({
          status: 0,
          message: "Usuario no encontrado",
        });
      }

      const orders = await Order.findAll({
        where: { UserId: user.id },
        include: Books,
      });;

      let refactorOrder = orders.map((el) => {
        return {
          id: el.id,
          direccion: el.direccion,
          telefono: el.telefono,
          pais: el.pais,
          total: el.total,
          fecha: el.createdAt,
          detalle: el.Books.map((el) => {
            return {
              title: el.title,
              price: el.price,
              cantidad: el.detalle.cantidad,
              sutTotal: el.detalle.cantidad * el.price,
            };
          }),
        };
      });

      const data = {
        user: {
          id: user.id,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
        },
        orders: refactorOrder,
      }

      res.status(200).json({
        status: 1,
        message: "Ordenes de usuario",
        data,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: 0,
        message: "No se pudo realizar la operación",
      });
    }
  },
  getAllOrders: async (req, res) => {
    try {
      const orders = await Order.findAll({ include: Books });

      let refactorOrder = await Promise.all(orders.map(async (el) => {
        const {id, name, lastName, email} = await User.findByPk(el.UserId);
        return {
          user: {
            id,
            name,
            lastName,
            email,
          },
          order: {
            id: el.id,
            direccion: el.direccion,
            telefono: el.telefono,
            pais: el.pais,
            total: el.total,
            fecha: el.createdAt,
            detalle: el.Books.map((el) => {
              return {
                title: el.title,
                price: el.price,
                cantidad: el.detalle.cantidad,
                sutTotal: el.detalle.cantidad * el.price,
              };
            }),
          }
        }
      }));
      res.status(200).json({
        status: 1,
        message: "Todas las ordes",
        data: refactorOrder,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: 0,
        message: "No se pudo realizar la operación",
      });
    }
  }
};

module.exports = adminControllers;
