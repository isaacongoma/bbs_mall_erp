class PDFTransformer:
    def __init__(self, browser):
        self.browser = browser
        self.body_pdf = browser.body_pdf
        self.is_print_designer = browser.is_print_designer
        self.encrypt_password = self.browser.options.get("password", None)
        self._set_header_pdf()
        self._set_footer_pdf()
        if not self.header_pdf and not self.footer_pdf:
            return
        self.no_of_pages = len(self.body_pdf.pages)

    def _set_header_pdf(self):
        self.header_pdf = None
        if hasattr(self.browser, "header_pdf"):
            self.header_pdf = self.browser.header_pdf
            self.is_header_dynamic = self.browser.is_header_dynamic

    def _set_footer_pdf(self):
        self.footer_pdf = None
        if hasattr(self.browser, "footer_pdf"):
            self.footer_pdf = self.browser.footer_pdf
            self.is_footer_dynamic = self.browser.is_footer_dynamic

    def transform_pdf(self, output=None):
        from pypdf import PdfWriter

        header = self.header_pdf
        body = self.body_pdf
        footer = self.footer_pdf

        if not header and not footer:
            if self.encrypt_password:
                return self._encrypt_raw(body)
            return body

        body_height = body.pages[0].mediabox.top
        body_transform = header_height = footer_height = 0

        if footer:
            footer_height = footer.pages[0].mediabox.top
            body_transform = footer_height

        if header:
            header_height = header.pages[0].mediabox.top
            header_transform = body_height + footer_height

        page_top = header_height + body_height + footer_height

        if header:
            for h in header.pages:
                self._transform(h, page_top, header_transform)

        for p in body.pages:
            self._transform(p, page_top, body_transform)

            if header:
                if self.is_header_dynamic:
                    p.merge_page(header.pages[min(p.page_number, len(header.pages) - 1)])
                elif self.is_print_designer:
                    if p.page_number == 0:
                        p.merge_page(header.pages[0])
                    elif p.page_number == self.no_of_pages - 1:
                        p.merge_page(header.pages[3])
                    elif p.page_number % 2 == 0:
                        p.merge_page(header.pages[2])
                    else:
                        p.merge_page(header.pages[1])
                else:
                    p.merge_page(header.pages[0])

            if footer:
                if self.is_footer_dynamic and len(footer.pages) > 1:
                    p.merge_page(footer.pages[min(p.page_number, len(footer.pages) - 1)])
                elif self.is_print_designer:
                    if p.page_number == 0:
                        p.merge_page(footer.pages[0])
                    elif p.page_number == self.no_of_pages - 1:
                        p.merge_page(footer.pages[3])
                    elif p.page_number % 2 == 0:
                        p.merge_page(footer.pages[2])
                    else:
                        p.merge_page(footer.pages[1])
                else:
                    p.merge_page(footer.pages[0])

        if output:
            output.append_pages_from_reader(body)
            return output

        writer = PdfWriter()
        writer.append_pages_from_reader(body)
        if self.encrypt_password:
            writer.encrypt(self.encrypt_password)

        return self.get_file_data_from_writer(writer)

    def _encrypt_raw(self, body):
        from io import BytesIO

        from pypdf import PdfReader, PdfWriter

        writer = PdfWriter()
        writer.append_pages_from_reader(PdfReader(BytesIO(body)))
        writer.encrypt(self.encrypt_password)
        return self.get_file_data_from_writer(writer)

    def _transform(self, page, page_top, ty):
        from pypdf import PdfWriter, Transformation

        transform = Transformation().translate(ty=ty)
        page.mediabox.upper_right = (page.mediabox.right, page_top)
        page.add_transformation(transform)
        return page

    def get_file_data_from_writer(self, writer_obj):
        from io import BytesIO

        stream = BytesIO()
        writer_obj.write(stream)

        stream.seek(0)

        return stream.read()
